/**
 * live-schedule.js
 *
 * Cómputo puro del horario de emisión del programa (sin DOM, testeable en node).
 *
 * La emitión es los jueves 19:00 UTC-3 — hora fija: Argentina no observa DST,
 * así que el schedule se define en UTC (22:00) y no se corre nunca.
 * La conversión a la hora local del visitante se hace en live-banner.js con
 * Intl (que sí respeta el DST de la zona del visitante).
 */

export const SHOW = {
  /** 0=domingo … 4=jueves (UTC) */
  weekdayUTC: 4,
  /** hora de inicio en UTC: 22:00 UTC = 19:00 UTC-3 */
  startHourUTC: 22,
  /** duración de la ventana "en vivo", en minutos */
  durationMin: 60,
  /** stream de la radio */
  url: "https://suipacha.gob.ar/radio/",
};

/**
 * Estado de la emisión respecto de `now`.
 *
 * @param {Date} now
 * @param {{weekdayUTC?: number, startHourUTC?: number, durationMin?: number}} [opts]
 * @returns {{status: "live"|"next", startsAt: Date, endsAt: Date}}
 */
export function nextBroadcast(now = new Date(), opts = {}) {
  const { weekdayUTC, startHourUTC, durationMin } = { ...SHOW, ...opts };

  // candidato: hoy a la hora de inicio, alineado al weekday objetivo
  const start = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    startHourUTC, 0, 0, 0
  ));
  const dayDelta = (weekdayUTC - start.getUTCDay() + 7) % 7;
  start.setUTCDate(start.getUTCDate() + dayDelta);

  const end = new Date(start.getTime() + durationMin * 60_000);

  if (now >= start && now < end) {
    return { status: "live", startsAt: start, endsAt: end };
  }
  if (now >= end) {
    // la ventana de esta semana ya pasó → próxima semana
    start.setUTCDate(start.getUTCDate() + 7);
    end.setTime(start.getTime() + durationMin * 60_000);
  }
  // now < start → emisión de esta semana aún no empieza
  return { status: "next", startsAt: start, endsAt: end };
}
