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

  const textEl = banner.querySelector(".live-text");
  if (!textEl) return;

  const { status, startsAt } = nextBroadcast(new Date());

  if (status === "live") {
    banner.setAttribute("data-state", "live");
    textEl.textContent = "Estamos en el aire — escuchanos ahora";
  } else {
    banner.setAttribute("data-state", "next");
    const now = new Date();
    const tz = visitorTimezone();
    // si el visitante ya está en Argentina, la hora local ES la de referencia
    const inArgentina = tz.startsWith("America/Argentina") || tz === "America/Buenos_Aires";
    if (isSameLocalDay(now, startsAt)) {
      // emisión HOY (p. ej. jueves en Argentina antes de las 19)
      textEl.textContent = `¡Hoy! Próxima emisión en ${formatCountdown(startsAt, now)} hs`;
    } else {
      const fecha = formatNextEmission(startsAt);
      textEl.textContent = inArgentina
        ? `Próxima emisión: ${fecha}`
        : `${fecha} (tu hora) — jueves 19:00 en Buenos Aires`;
    }
  }
}

function init() {
  render();
  setInterval(() => {
    if (document.visibilityState === "visible") render();
  }, REFRESH_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
