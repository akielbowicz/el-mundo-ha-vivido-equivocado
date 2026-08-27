import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AUDIO_RE,
  episodeNumberFromFile,
  parseAudioFilename,
  dedupeEpisodes,
  findProgramaAudio,
} from "./programa-audio.mjs";

/* ── AUDIO_RE ──────────────────────────── */

test("AUDIO_RE matchea filenames válidos", () => {
  assert.ok(AUDIO_RE.test("001-20260813.mp3"));
  assert.ok(AUDIO_RE.test("001-20260813-dur3520.mp3"));
  assert.ok(AUDIO_RE.test("012-20260101.WAV"));
  assert.ok(AUDIO_RE.test("123-20261231-dur0.flac"));
});

test("AUDIO_RE rechaza filenames inválidos", () => {
  assert.ok(!AUDIO_RE.test("episodio-01.mp3"));
  assert.ok(!AUDIO_RE.test("12-20260813.mp3")); // num sin 3 dígitos
  assert.ok(!AUDIO_RE.test("001-2026.mp3")); // fecha incompleta
  assert.ok(!AUDIO_RE.test("001-20260813.txt"));
  assert.ok(!AUDIO_RE.test("001.mp3"));
});

/* ── episodeNumberFromFile ─────────────── */

test("episodeNumberFromFile extrae el prefijo numérico", () => {
  assert.equal(episodeNumberFromFile("001-casas-hecker.md"), 1);
  assert.equal(episodeNumberFromFile("012-otro.md"), 12);
});

test("episodeNumberFromFile devuelve null sin prefijo válido", () => {
  assert.equal(episodeNumberFromFile("episodio.md"), null);
  assert.equal(episodeNumberFromFile("12-x.md"), null);
  assert.equal(episodeNumberFromFile("x-001.md"), null);
});

/* ── parseAudioFilename ────────────────── */

test("parseAudioFilename parsea raw sin -dur", () => {
  const p = parseAudioFilename("001-20260813.mp3");
  assert.equal(p.num, 1);
  assert.equal(p.durSecs, null);
  assert.equal(p.date.toISOString().slice(0, 10), "2026-08-13");
});

test("parseAudioFilename parsea -dur en segundos", () => {
  const p = parseAudioFilename("002-20260820-dur3667.mp3");
  assert.equal(p.num, 2);
  assert.equal(p.durSecs, 3667);
});

test("parseAudioFilename devuelve null para inválidos", () => {
  assert.equal(parseAudioFilename("readme.md"), null);
});

/* ── dedupeEpisodes ────────────────────── */

test("dedupeEpisodes: -dur gana sobre raw", () => {
  const entries = [
    { num: 1, durSecs: null, file: "001-20260813.mp3" },
    { num: 1, durSecs: 3520, file: "001-20260813-dur3520.mp3" },
  ];
  const out = dedupeEpisodes(entries);
  assert.equal(out.length, 1);
  assert.equal(out[0].file, "001-20260813-dur3520.mp3");
});

test("dedupeEpisodes: raw ya presente, -dur después → reemplaza", () => {
  const entries = [
    { num: 1, durSecs: null, file: "a.mp3" },
    { num: 1, durSecs: 100, file: "b.mp3" },
  ];
  assert.equal(dedupeEpisodes(entries)[0].file, "b.mp3");
});

test("dedupeEpisodes: dos raws → queda el primero", () => {
  const entries = [
    { num: 2, durSecs: null, file: "first.mp3" },
    { num: 2, durSecs: null, file: "second.mp3" },
  ];
  assert.equal(dedupeEpisodes(entries)[0].file, "first.mp3");
});

test("dedupeEpisodes: -dur ya presente, raw después → no pisa", () => {
  const entries = [
    { num: 3, durSecs: 200, file: "edited.mp3" },
    { num: 3, durSecs: null, file: "raw.mp3" },
  ];
  assert.equal(dedupeEpisodes(entries)[0].file, "edited.mp3");
});

test("dedupeEpisodes: ordena por número", () => {
  const out = dedupeEpisodes([
    { num: 3, durSecs: null, file: "c.mp3" },
    { num: 1, durSecs: null, file: "a.mp3" },
    { num: 2, durSecs: null, file: "b.mp3" },
  ]);
  assert.deepEqual(out.map((e) => e.num), [1, 2, 3]);
});

/* ── findProgramaAudio (con dir temporal) ── */

test("findProgramaAudio encuentra por número y arma la URL pública", async () => {
  const dir = mkdtempSync(join(tmpdir(), "prog-audio-"));
  try {
    writeFileSync(join(dir, "001-20260813.mp3"), "x");
    writeFileSync(join(dir, "002-20260820-dur3667.mp3"), "x");

    const rec = await findProgramaAudio({ num: 2, srcDir: dir, releases: false });
    assert.equal(rec.file, "002-20260820-dur3667.mp3");
    assert.equal(rec.url, "/programa/002-20260820-dur3667.mp3");
    assert.equal(rec.durSecs, 3667);
    assert.equal(rec.source, "local");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findProgramaAudio: sin match → null (sin lanzar, sin red)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "prog-audio-"));
  try {
    writeFileSync(join(dir, "001-20260813.mp3"), "x");
    const rec = await findProgramaAudio({ num: 9, srcDir: dir, releases: false });
    assert.equal(rec, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findProgramaAudio: sin fuentes → null con releases deshabilitado", async () => {
  const dir = mkdtempSync(join(tmpdir(), "prog-audio-"));
  try {
    const rec = await findProgramaAudio({ num: 1, srcDir: dir, releases: false });
    assert.equal(rec, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findProgramaAudio: num null → null sin tocar fuentes", async () => {
  assert.equal(await findProgramaAudio({ num: null, releases: false }), null);
  assert.equal(await findProgramaAudio({ releases: false }), null);
});
