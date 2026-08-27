/**
 * live-banner.js
 *
 * Mejora progresiva del banner "escuchanos en vivo" (el markup server-rendered
 * muestra el horario estático sin JS). Con JS:
 *   - estado "live":  el programa está al aire (jueves 22:00–23:00 UTC)
 *   - estado "next":  muestra la próxima emisión en la hora LOCAL del visitante
 *     (Intl.DateTimeFormat con la timezone del browser — DST-proof)
 * Refresca cada minuto mientras la pestaña está visible.
 */

import { nextBroadcast, formatNextEmission, formatCountdown, isSameLocalDay } from "./live-schedule.mjs";

const REFRESH_MS = 60_000;

function visitorTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function render() {
  const banner = document.querySelector("[data-live-banner]");
  if (!banner) return;

  const infoEl = banner.querySelector(".live-info");
  const ctaEl = banner.querySelector(".live-cta");
  const extraEl = banner.querySelector(".live-extra");
  if (!infoEl || !ctaEl) return;

  const { status, startsAt } = nextBroadcast(new Date());

  if (status === "live") {
    banner.setAttribute("data-state", "live");
    infoEl.textContent = "Estamos en el aire";
    ctaEl.textContent = "Escuchar ahora";
    if (extraEl) extraEl.textContent = "";
    return;
  }

  banner.setAttribute("data-state", "next");
  const now = new Date();
  const tz = visitorTimezone();
  // si el visitante ya está en Argentina, la hora local ES la de referencia
  const inArgentina = tz.startsWith("America/Argentina") || tz === "America/Buenos_Aires";

  if (isSameLocalDay(now, startsAt)) {
    // emisión HOY (p. ej. jueves en Argentina antes de las 19)
    infoEl.textContent = `¡Hoy! Próxima emisión en ${formatCountdown(startsAt, now)} hs`;
  } else {
    infoEl.textContent = `Próxima emisión: ${formatNextEmission(startsAt)}`;
  }
  if (extraEl) {
    extraEl.textContent = inArgentina ? "" : "· 19:00 Buenos Aires";
  }
  ctaEl.textContent = "Escuchar en vivo";
}

function init() {
  render();
  setInterval(() => {
    if (document.visibilityState === "visible") render();
  }, REFRESH_MS);
}

// no ejecutar el wiring DOM fuera del browser (p. ej. si algo lo importa en node)
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
