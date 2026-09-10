#!/usr/bin/env node
/**
 * verify-texto.mjs
 *
 * Verifica que un texto transcrito en sitio/textos/ sea correcto, en dos fases:
 *
 *   1. Checks deterministas (sin IA): frontmatter, slug, números de página
 *      filtrados, cursivas balanceadas, palabras cortadas, mojibake, etc.
 *   2. OCR cruzado: re-transcribe cada imagen por separado con una llamada
 *      directa a OpenRouter (canal independiente al agente que hizo la
 *      transcripción, sin skill ni reglas de formato) y compara palabra a
 *      palabra (LCS) contra el markdown. Detecta páginas omitidas y
 *      contenido alucinado.
 *
 * Uso:
 *   node scripts/verify-texto.mjs sitio/textos/desayuno-perfecto.md materiales/raw/imagenes/textos/día-perfecto
 *   node scripts/verify-texto.mjs sitio/textos/desayuno-perfecto.md   # solo fase 1
 *
 * Exit: 0 ok (con warnings), 1 si hay errores críticos.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import os from "node:os";

const OCR_MODEL = "google/gemini-2.5-flash";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/* ── Errores ───────────────────────────── */

const errors = [];
const warnings = [];
const fail = (check, msg) => errors.push(`[${check}] ${msg}`);
const warn = (check, msg) => warnings.push(`[${check}] ${msg}`);

/* ── Args ──────────────────────────────── */

const [mdPath, imagesDir] = process.argv.slice(2);

if (!mdPath || !existsSync(mdPath)) {
  console.error("Uso: node scripts/verify-texto.mjs <texto.md> [dir-de-imagenes]");
  process.exit(1);
}

if (imagesDir && !existsSync(imagesDir)) {
  console.error(`✗ No existe el directorio de imágenes: ${imagesDir}`);
  process.exit(1);
}

/* ── Carga del archivo ─────────────────── */

const raw = readFileSync(mdPath, "utf8");
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
let frontmatter = {};
let body = raw;

if (!fmMatch) {
  fail("frontmatter", "no tiene bloque frontmatter (--- ... ---)");
} else {
  for (const line of fmMatch[1].split("\n")) {
    const m = line.match(/^(\w[\w-]*):\s*"?(.*?)"?\s*$/);
    if (m) frontmatter[m[1]] = m[2];
  }
  body = raw.slice(fmMatch[0].length);
}

/* ── FASE 1: checks deterministas ──────── */

console.log("─ Fase 1: checks deterministas\n");

// Frontmatter requerido
for (const field of ["title", "author", "date", "status", "description", "genre", "license"]) {
  if (!frontmatter[field]) fail("frontmatter", `falta el campo "${field}"`);
}
if (frontmatter.status && frontmatter.status !== "draft") {
  warn("frontmatter", `status es "${frontmatter.status}" (se espera "draft" antes de publicar)`);
}
if (frontmatter.date && !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.date)) {
  fail("frontmatter", `date "${frontmatter.date}" no es YYYY-MM-DD`);
}
if (!frontmatter.license || !/cita/i.test(frontmatter.license)) {
  warn("frontmatter", "license no menciona derecho de cita");
}

// Slug vs título
const slugify = (t) =>
  t
    .toLowerCase()
    .replaceAll(/[áàäâ]/g, "a")
    .replaceAll(/[éèëê]/g, "e")
    .replaceAll(/[íìïî]/g, "i")
    .replaceAll(/[óòöô]/g, "o")
    .replaceAll(/[úùüû]/g, "u")
    .replaceAll(/ñ/g, "n")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
if (frontmatter.title) {
  const expected = `${slugify(frontmatter.title)}.md`;
  const actual = mdPath.split("/").pop();
  if (actual !== expected) warn("slug", `archivo "${actual}" ≠ título (${expected})`);
}

// Comentarios HTML balanceados
const openComments = (body.match(/<!--/g) || []).length;
const closeComments = (body.match(/-->/g) || []).length;
if (openComments !== closeComments) {
  fail("comentarios", `<!-- (${openComments}) y --> (${closeComments}) desbalanceados`);
}

// [ilegible] sin documentar
const ilegible = (body.match(/\[ilegible\]/gi) || []).length;
if (ilegible > 0 && openComments === 0) {
  warn("ilegible", `${ilegible} marcador(es) [ilegible] pero ningún comentario HTML que lo explique`);
} else if (ilegible > 0) {
  warn("ilegible", `${ilegible} marcador(es) [ilegible] (documentados en comentario HTML)`);
}

// Párrafos
const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim() && !p.trim().startsWith("<!--"));

for (const [i, p] of paragraphs.entries()) {
  const snippet = p.trim().slice(0, 50).replaceAll("\n", " ");

  // Número de página filtrado
  if (/^\s*\d{1,4}\s*$/.test(p)) fail("pagina", `pág. ${i + 1} es solo un número: "${snippet}"`);

  // Encabezado del cuento duplicado
  if (frontmatter.title && p.trim().toLowerCase() === frontmatter.title.toLowerCase()) {
    warn("encabezado", `pág. ${i + 1} es exactamente el título (¿encabezado del libro filtrado?)`);
  }

  // Cursivas sin cerrar: * impar por párrafo (ignorando ** que no debería haber)
  if (p.includes("**")) warn("markdown", `pág. ${i + 1} tiene ** (bold inesperado): "${snippet}"`);
  const stars = (p.match(/\*/g) || []).length;
  if (stars % 2 !== 0) fail("cursivas", `pág. ${i + 1} tiene * sin cerrar: "${snippet}"`);

  // Palabra cortada que sobrevivió (guión + espacio entre letras)
  const cut = p.match(/(\p{Ll})-\s+(\p{Ll})/gu);
  if (cut) warn("palabras-cortadas", `pág. ${i + 1}: "${cut[0]}" (¿palabra cortada sin unir?)`);

  // Mojibake
  if (/Ã[\x80-\xBF]|â€|Â\s/.test(p)) fail("encoding", `pág. ${i + 1} tiene mojibake: "${snippet}"`);
}

// Consistencia de contenido vs número de páginas OCR-adas (si hay dir)
let pageImageCount = 0;
if (imagesDir) {
  const exts = [".jpg", ".jpeg", ".png", ".webp"];
  pageImageCount = readdirSync(imagesDir).filter((f) => exts.includes(f.toLowerCase().slice(-5)) || exts.some((e) => f.toLowerCase().endsWith(e))).length;
}

/* ── FASE 2: OCR cruzado ───────────────── */

let ocrOk = true;
if (imagesDir) {
  console.log("\n─ Fase 2: OCR cruzado (canal independiente)\n");

  const apiKey = process.env.OPENROUTER_API_KEY || readPiKey();
  if (!apiKey) {
    warn("ocr", "sin key de OpenRouter — se saltea la fase 2");
  } else {
    const mdWords = tokenize(stripFormatting(body));
    const exts = [".jpg", ".jpeg", ".png", ".webp"];
    const images = readdirSync(imagesDir)
      .filter((f) => exts.some((e) => f.toLowerCase().endsWith(e)))
      .sort(new Intl.Collator("es", { numeric: true }).compare);

    let totalOcrWords = 0;
    for (const img of images) {
      const imgPath = join(imagesDir, img);
      process.stdout.write(`  ${img}: `);
      let ocrText;
      try {
        ocrText = await ocrImage(imgPath, apiKey);
      } catch (e) {
        warn("ocr", `${img} falló: ${e.message}`);
        console.log("ERROR");
        ocrOk = false;
        continue;
      }
      const ocrWords = tokenize(stripFormatting(ocrText));
      totalOcrWords += ocrWords.length;
      const ratio = lcsRatio(ocrWords, mdWords);
      const pct = (ratio * 100).toFixed(1);
      if (ratio < 0.8) {
        fail("ocr", `${img}: solo ${(ratio * 100).toFixed(1)}% del OCR aparece en el md (¿página mal transcrita?)`);
        console.log(`✗ ${pct}%`);
        ocrOk = false;
      } else if (ratio < 0.9) {
        warn("ocr", `${img}: ${(ratio * 100).toFixed(1)}% de coincidencia (revisar)`);
        console.log(`⚠ ${pct}%`);
      } else {
        console.log(`✓ ${pct}%`);
      }
    }

    // Conteo de palabras en ambas direcciones: omisiones y alucinaciones
    if (ocrOk && pageImageCount > 0) {
      const mdWordCount = mdWords.length;
      if (mdWordCount < totalOcrWords * 0.75) {
        fail("contenido", `el md tiene ${mdWordCount} palabras vs ${totalOcrWords} del OCR (¿páginas omitidas?)`);
      } else if (mdWordCount > totalOcrWords * 1.4) {
        fail("contenido", `el md tiene ${mdWordCount} palabras vs ${totalOcrWords} del OCR (¿contenido alucinado?)`);
      }
    }
  }
}

/* ── Reporte ───────────────────────────── */

console.log(`\n${"═".repeat(44)}`);
if (errors.length) {
  console.log(`✗ ${errors.length} error(es), ${warnings.length} warning(s):`);
  for (const e of errors) console.log(`  ${e}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  process.exit(1);
}
if (warnings.length) {
  console.log(`⚠ ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ${w}`);
} else {
  console.log(ocrOk || !imagesDir ? "✓ Todo verificado" : "✓ Verificado (con errores de OCR)");
}
process.exit(0);

/* ── Helpers ───────────────────────────── */

function readPiKey() {
  try {
    const auth = JSON.parse(readFileSync(join(os.homedir(), ".pi/agent/auth.json"), "utf8"));
    return auth.openrouter?.key || "";
  } catch {
    return "";
  }
}

/** OCR de una sola imagen: llamada directa a OpenRouter, sin skill ni formato. */
async function ocrImage(imgPath, apiKey) {
  const jpeg = execFileSync("magick", [imgPath, "-resize", "1200x1200>", "jpg:-"], {
    maxBuffer: 20 * 1024 * 1024,
  });
  const b64 = jpeg.toString("base64");
  const resp = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OCR_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Transcribí TODO el texto visible de esta página de un libro, exactamente como está escrito, sin resumir ni omitir nada. Ignorá números de página. Devolvé solo el texto.",
            },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
          ],
        },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("respuesta vacía");
  return text;
}

/** Saca markdown y comentarios, normaliza para comparar. */
function stripFormatting(text) {
  return text
    .replaceAll(/<!--[\s\S]*?-->/g, " ")
    .replaceAll(/\[ilegible\]/gi, " ")
    .replaceAll(/[*_#>`]/g, "")
    .replaceAll(/[“”„«»]/g, '"')
    .replaceAll(/[‘’‚]/g, "'")
    .replaceAll(/[—–]/g, " ")
    .replaceAll(/(\p{L})-(\p{Ll})/gu, "$1$2")
    .toLowerCase();
}

/** Palabras con al menos una letra o número. */
function tokenize(text) {
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu) || []).filter(Boolean);
}

/** Fracción de palabras de `a` que aparecen en orden dentro de `b` (LCS). */
function lcsRatio(a, b) {
  if (a.length === 0) return 1;
  const n = a.length;
  const m = b.length;
  const dp = new Uint32Array((n + 1) * (m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i * (m + 1) + j] =
        a[i - 1] === b[j - 1]
          ? dp[(i - 1) * (m + 1) + (j - 1)] + 1
          : Math.max(dp[(i - 1) * (m + 1) + j], dp[i * (m + 1) + (j - 1)]);
    }
  }
  return dp[n * (m + 1) + m] / n;
}
