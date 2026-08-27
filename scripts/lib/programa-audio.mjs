/**
 * programa-audio.mjs
 *
 * Descubrimiento de grabaciones completas del programa ("programas"),
 * compartido entre build-episodes.mjs y build-programa.mjs.
 *
 * Fuentes (en orden de prioridad):
 *   1. Archivos locales en materiales/programas/ (001-20260813.mp3)
 *   2. Si no hay locales: assets de los releases de GitHub (caso CI,
 *      donde la carpeta materiales/ no se commitea)
 *
 * El número de episodio (prefijo del .md en sitio/episodios/, p. ej.
 * "001-casas-hecker.md" → 1) se matchea con el número del audio
 * ("001-20260813.mp3" o release "episodio-001"). La variante editada
 * (-durNNN) gana sobre la raw.
 *
 * Uso:
 *   const rec = await findProgramaAudio({ num: 1 }); // → { file, url, ... } | null
 *
 * El descubrimiento es cacheado por proceso. Con `graceful: true` (default)
 * un fallo de la API de GitHub devuelve [] + warning — nunca rompe el build.
 * `graceful: false` relanza el error (build-programa.mjs, que SÍ necesita
 * los archivos, usa este modo).
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_SRC_DIR = "materiales/programas";
const REPO = "akielbowicz/el-mundo-ha-vivido-equivocado";
const API = `https://api.github.com/repos/${REPO}/releases?per_page=100`;

// Archivos esperados: 001-20260813.mp3, 001-20260813-dur3520.mp3, ...
export const AUDIO_RE =
  /^(\d{3})-(\d{4})(\d{2})(\d{2})(?:-dur(\d+))?\.(mp3|wav|flac|ogg|m4a)$/i;

/**
 * Número de episodio desde el filename del .md.
 * "001-casas-hecker.md" → 1 · "episodio.md" → null
 */
export function episodeNumberFromFile(file) {
  const m = file.match(/^(\d{3})-/);
  return m ? parseInt(m[1], 10) : null;
}

/** Parsea el filename de audio → { num, durSecs, date } | null. */
export function parseAudioFilename(file) {
  const m = file.match(AUDIO_RE);
  if (!m) return null;
  const [, num, y, mo, d, dur] = m;
  return {
    num: parseInt(num, 10),
    durSecs: dur ? parseInt(dur, 10) : null,
    date: new Date(`${y}-${mo}-${d}T12:00:00`),
  };
}

/**
 * Un solo archivo por número; el -dur (editado) gana sobre el raw.
 * Input sin dedup, output ordenado por número.
 */
export function dedupeEpisodes(entries) {
  const byNum = new Map();
  for (const ep of entries) {
    const existing = byNum.get(ep.num);
    if (existing) {
      // Ya hay un -dur (cualquier caso) → este no aporta
      if (existing.durSecs !== null) continue;
      // El existente es raw y este también → skip
      if (ep.durSecs === null) continue;
      // El existente es raw y este es -dur → reemplazar (dejar pasar)
    }
    byNum.set(ep.num, ep);
  }
  return [...byNum.values()].sort((a, b) => a.num - b.num);
}

/* ── Fuentes ───────────────────────────── */

function listLocalEpisodes(srcDir) {
  if (!existsSync(srcDir)) return [];
  const entries = [];
  for (const f of readdirSync(srcDir)) {
    const parsed = parseAudioFilename(f);
    if (!parsed) continue;
    const sizeMb = (statSync(join(srcDir, f)).size / (1024 * 1024)).toFixed(1);
    entries.push({
      ...parsed,
      file: f,
      sizeMb,
      url: `/programa/${f}`,
      source: "local",
      srcPath: join(srcDir, f),
    });
  }
  return dedupeEpisodes(entries);
}

async function listReleaseEpisodes() {
  console.log("  programa-audio: no hay locales — consultando releases de GitHub...");

  const res = await fetch(API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const releases = await res.json();
  const entries = [];

  for (const r of releases) {
    if (!r.tag_name?.startsWith("episodio-")) continue;
    const num = parseInt(r.tag_name.replace("episodio-", ""), 10);
    const asset = r.assets?.find((a) => AUDIO_RE.test(a.name));
    if (!asset) continue;

    const parsed = parseAudioFilename(asset.name);
    if (!parsed) continue;
    entries.push({
      ...parsed,
      num, // del tag, por si el filename difiere
      file: asset.name,
      sizeMb: (asset.size / (1024 * 1024)).toFixed(1),
      url: `/programa/${asset.name}`,
      source: "release",
      downloadUrl: asset.browser_download_url,
    });
  }

  return dedupeEpisodes(entries);
}

/* ── Descubrimiento (cacheado por proceso) ── */

async function discover({ srcDir = DEFAULT_SRC_DIR, graceful = true, releases = true } = {}) {
  const local = listLocalEpisodes(srcDir);
  if (local.length > 0) return local;
  if (!releases) return [];

  try {
    return await listReleaseEpisodes();
  } catch (err) {
    if (!graceful) throw err;
    console.warn(
      `  ⚠ programa-audio: no se pudo consultar releases de GitHub (${err.message}) — episodios sin audio`,
    );
    return [];
  }
}

// Cache por proceso, keyed por fuente (srcDir + releases) para que llamadas
// con distintas fuentes no se pisen.
const cache = new Map();

function cacheKey({ srcDir = DEFAULT_SRC_DIR, releases = true } = {}) {
  return `${srcDir}|${releases}`;
}

/**
 * Lista completa de grabaciones. Cacheada por proceso; en fallo (modo
 * estricto) limpia la cache para permitir retry.
 */
export function listProgramaAudio(opts = {}) {
  const key = cacheKey(opts);
  if (!cache.has(key)) {
    cache.set(
      key,
      discover(opts).catch((err) => {
        cache.delete(key);
        throw err;
      }),
    );
  }
  return cache.get(key);
}

/** Grabación de un episodio por número → entry | null. */
export async function findProgramaAudio({ num, ...opts } = {}) {
  if (num == null) return null;
  const all = await listProgramaAudio(opts);
  return all.find((e) => e.num === num) || null;
}
