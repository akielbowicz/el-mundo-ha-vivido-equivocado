# Tasks: add-live-banner

- [ ] 1.1 `src/live-schedule.js`: `nextBroadcast(now, { weekday: 4, utcHour: 22, durationMin: 60 })`
      → `{ status: "live" | "next", startsAt: Date, endsAt: Date }` (puro, testeable)
- [ ] 1.2 `src/live-schedule.test.mjs`: casos — jueves antes/durante/después de la hora,
      miércoles, viernes, borde exacto 22:00:00 y 22:59:59, DST del visitante no afecta
- [ ] 1.3 `src/live-banner.js`: wiring — estado live/next, formato de hora local con
      Intl, refresh cada 60s solo si `document.visibilityState === "visible"`
- [ ] 1.4 Banner markup en los 5 templates + 404.html (fallback estático sin JS)
- [ ] 1.5 CSS: `.live-banner` + estados + punto "en vivo" con `prefers-reduced-motion`
- [ ] 1.6 `justfile`: copiar `src/live-banner.js` → `dist/live-banner.mjs` en `bundle-js`;
      agregar test a `check-tests`
- [ ] 1.7 Tests + `just check` completo verde
