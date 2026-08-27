import { test } from "node:test";
import assert from "node:assert/strict";
import { nextBroadcast, formatNextEmission, formatCountdown, isSameLocalDay, SHOW } from "./live-schedule.js";

const d = (iso) => new Date(iso);

test("jueves antes de las 22:00 UTC → emisión de hoy", () => {
  const r = nextBroadcast(d("2026-08-27T21:59:00Z"));
  assert.equal(r.status, "next");
  assert.equal(r.startsAt.toISOString(), "2026-08-27T22:00:00.000Z");
});

test("jueves exactamente 22:00:00 → en vivo", () => {
  const r = nextBroadcast(d("2026-08-27T22:00:00Z"));
  assert.equal(r.status, "live");
});

test("jueves a mitad de la ventana → en vivo", () => {
  const r = nextBroadcast(d("2026-08-27T22:30:00Z"));
  assert.equal(r.status, "live");
  assert.equal(r.endsAt.toISOString(), "2026-08-27T23:00:00.000Z");
});

test("jueves 22:59:59 → todavía en vivo", () => {
  const r = nextBroadcast(d("2026-08-27T22:59:59Z"));
  assert.equal(r.status, "live");
});

test("jueves 23:00:00 → próxima semana", () => {
  const r = nextBroadcast(d("2026-08-27T23:00:00Z"));
  assert.equal(r.status, "next");
  assert.equal(r.startsAt.toISOString(), "2026-09-03T22:00:00.000Z");
});

test("miércoles → mañana jueves", () => {
  const r = nextBroadcast(d("2026-08-26T12:00:00Z"));
  assert.equal(r.status, "next");
  assert.equal(r.startsAt.toISOString(), "2026-08-27T22:00:00.000Z");
});

test("viernes → el jueves de la semana siguiente", () => {
  const r = nextBroadcast(d("2026-08-28T00:00:00Z"));
  assert.equal(r.status, "next");
  assert.equal(r.startsAt.toISOString(), "2026-09-03T22:00:00.000Z");
});

test("sábado → jueves siguiente", () => {
  const r = nextBroadcast(d("2026-08-29T23:59:00Z"));
  assert.equal(r.startsAt.toISOString(), "2026-09-03T22:00:00.000Z");
});

test("la hora local del visitante no afecta el cómputo UTC", () => {
  // mismo instante, expresado con offset local — el resultado es idéntico
  const utc = nextBroadcast(d("2026-08-27T22:30:00Z"));
  const offset = nextBroadcast(d("2026-08-27T19:30:00-03:00"));
  assert.deepEqual(utc, offset);
});

test("SHOW expone la URL de la radio", () => {
  assert.equal(SHOW.url, "https://suipacha.gob.ar/radio/");
});

const BA = { timeZone: "America/Argentina/Buenos_Aires" };

test("formatNextEmission: fecha completa en español", () => {
  const s = formatNextEmission(d("2026-08-27T22:00:00Z"), BA);
  assert.match(s, /jueves/);
  assert.match(s, /27 de agosto/);
  assert.match(s, /19:00/);
});

test("formatNextEmission: respeta la zona horaria pedida", () => {
  const s = formatNextEmission(d("2026-08-27T22:00:00Z"), { timeZone: "Asia/Tokyo" });
  assert.match(s, /viernes/);
  assert.match(s, /07:00/);
});

test("formatCountdown: horas y minutos paddeados", () => {
  const start = d("2026-08-27T22:00:00Z");
  assert.equal(formatCountdown(start, d("2026-08-27T19:30:00Z")), "02:30");
  assert.equal(formatCountdown(start, d("2026-08-27T21:59:00Z")), "00:01");
  assert.equal(formatCountdown(start, d("2026-08-27T12:00:00Z")), "10:00");
});

test("formatCountdown: nunca negativo", () => {
  const start = d("2026-08-27T22:00:00Z");
  assert.equal(formatCountdown(start, d("2026-08-27T23:00:00Z")), "00:00");
});

test("isSameLocalDay: mismo día local aunque cambie la hora", () => {
  const now = d("2026-08-27T15:00:00Z");
  assert.equal(isSameLocalDay(now, d("2026-08-27T03:00:00Z")), true);
  assert.equal(isSameLocalDay(now, d("2026-08-28T15:00:00Z")), false);
});
