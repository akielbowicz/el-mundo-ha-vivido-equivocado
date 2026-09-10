#!/usr/bin/env node
/**
 * order-images.mjs
 *
 * Determina el orden de lectura de fotos de páginas de un libro en un
 * directorio. Los nombres de archivo pueden no codificar el orden (ej:
 * AC54F172A191D2EB286CF75F4DFBE8E5.jpeg).
 *
 * Estrategia: una única llamada de visión a OpenRouter que ve todas las
 * imágenes juntas y devuelve el número de página impreso de cada una y el
 * orden resultante. Fallback: orden natural por nombre de archivo.
 *
 * Uso:
 *   node scripts/order-images.mjs materiales/raw/imagenes/textos/día-perfecto
 *
 * Output (stdout): las rutas en orden de lectura, una por línea.
 * Diagnósticos y errores: stderr.
 * Exit: 0 ok, 1 error irrecuperable.
 */

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import os from "node:os";

const MODEL = "z-ai/glm-5.3-flash"; // ID de OpenRouter (sin prefijo "openrouter/", ese es interno de pi)
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

const dir = process.argv[2];
if (!dir || !readdirSync) {
  console.error("Uso: node scripts/order-images.mjs <dir-de-imagenes>");
  process.exit(1);
}
if (!exists(dir)) {
  console.error(`✗ No existe ${dir}`);
  process.exit(1);
}

function exists(d) {
  try {
    readdirSync(d);
    return true;
  } catch {
    return false;
  }
}

/* ── Imágenes en orden natural (baseline / fallback) ── */

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const images = readdirSync(dir)
  .filter((f) => IMAGE_EXTS.some((e) => f.toLowerCase().endsWith(e)))
  .sort(collator.compare);

if (images.length === 0) {
  console.error(`✗ No hay imágenes en ${dir}`);
  process.exit(1);
}
if (images.length === 1) {
  console.log(join(dir, images[0]));
  process.exit(0);
}

/* ── Key ──────────────────────────────── */

function readPiKey() {
  try {
    const auth = JSON.parse(readFileSync(join(os.homedir(), ".pi/agent/auth.json"), "utf8"));
    return auth.openrouter?.key || "";
  } catch {
    return "";
  }
}
const apiKey = process.env.OPENROUTER_API_KEY || readPiKey();

/* ── Pasada de visión ─────────────────── */

async function determineOrder() {
  if (!apiKey) throw new Error("sin key de OpenRouter (env OPENROUTER_API_KEY o ~/.pi/agent/auth.json)");

  const content = [
    {
      type: "text",
      text:
        `Estas son ${images.length} fotos de páginas consecutivas de un libro, en este orden por nombre de archivo:\n` +
        images.map((f, i) => `  Imagen ${i + 1}: ${f}`).join("\n") +
        `\n\nDeterminá el orden de LECTURA de las páginas:\n` +
        `1. Si una página tiene número de página impreso (esquina), usalo.\n` +
        `2. Si no, deducí el orden por continuidad del texto (frases cortadas entre páginas, principio/fin de capítulo).\n\n` +
        `Respondé SOLO JSON válido, sin markdown:\n` +
        `{"order": ["<archivo>", ...], "pages": {"<archivo>": <número impreso o null>, ...}, "note": "<1 frase con el criterio>"}`,
    },
  ];

  for (const f of images) {
    const jpeg = execFileSync("magick", [join(dir, f), "-resize", "800x800>", "jpg:-"], {
      maxBuffer: 20 * 1024 * 1024,
    });
    content.push({
      type: "text",
      text: `Imagen: ${f}`,
    });
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } });
  }

  const resp = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages: [{ role: "user", content }] }),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("respuesta sin JSON");
  const parsed = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(parsed.order)) throw new Error("JSON sin array 'order'");

  // Validación: mismo set de archivos
  const requested = new Set(images);
  const returned = new Set(parsed.order);
  const sameSet = images.length === parsed.order.length && [...returned].every((f) => requested.has(f));
  if (!sameSet) throw new Error("el orden devuelto no coincide con los archivos del directorio");

  return parsed;
}

let result;
try {
  result = await determineOrder();
} catch (e) {
  console.error(`⚠ No se pudo determinar el orden por visión (${e.message}) — fallback: orden natural por nombre`);
  for (const f of images) console.log(join(dir, f));
  process.exit(0);
}

const pagesInfo = Object.entries(result.pages || {})
  .map(([f, p]) => `${f.slice(0, 12)}…=${p ?? "?"}`)
  .join(" ");
console.error(`→ Orden por: ${result.note || "visión"} (${pagesInfo})`);

for (const f of result.order) console.log(join(dir, f));
