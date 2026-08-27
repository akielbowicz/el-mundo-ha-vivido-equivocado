import { test } from "node:test";
import assert from "node:assert/strict";
import { nextBroadcast, SHOW } from "./live-schedule.js";

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
