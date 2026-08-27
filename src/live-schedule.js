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

/**
 * Fecha completa de la emisión en español: "jueves, 27 de agosto, 19:00".
 * Sin timeZone muestra la zona del visitante (runtime); el build puede pasar
 * una fija (America/Argentina/Buenos_Aires).
 */
export function formatNextEmission(startsAt, opts = {}) {
  const fmt = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
  return fmt.format(startsAt);
}

/** Countdown "HH:MM" desde now hasta startsAt. */
export function formatCountdown(startsAt, now = new Date()) {
  const ms = Math.max(0, startsAt - now);
  const hh = Math.floor(ms / 3_600_000);
  const mm = Math.floor((ms % 3_600_000) / 60_000);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Misma fecha de calendario local (día/mes/año). */
export function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
