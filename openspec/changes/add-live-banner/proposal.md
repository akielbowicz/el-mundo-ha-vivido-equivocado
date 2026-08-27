# Add "escuchanos en vivo" banner

## Why

El programa se emite los **jueves 19:00 UTC-3** (hora fija: Argentina no observa DST,
equivalente a **22:00 UTC** todo el año) por https://suipacha.gob.ar/radio/.
El sitio no lo menciona: un visitante no sabe cuándo ni dónde escuchar en vivo.

## What Changes

- **Banner "En vivo / Escuchanos"** en todas las páginas (debajo del header), con enlace
  a https://suipacha.gob.ar/radio/.
- **Fallback sin JS (server-rendered):** texto estático "Jueves 19:00 (UTC-3) — Escuchanos
  en vivo". El contenido es visible sin JavaScript, como el resto del sitio.
- **Mejora progresiva con JS** (`src/live-schedule.js` — cómputo puro, + `src/live-banner.js`
  — wiring DOM):
  - calcula la **próxima emisión** = próximo jueves 22:00 UTC (hoy cuenta si aún no empezó)
  - la muestra en la **zona horaria local del visitante** via `Intl.DateTimeFormat` con
    `timeZone` del browser — sin offsets hardcodeados, DST-proof
  - **estado EN VIVO** durante la ventana (jueves 22:00–23:00 UTC): cambia el texto,
    agrega indicador visual (respeta `prefers-reduced-motion`)
  - refresca cada minuto (visibilidad: solo mientras la pestaña está visible)
- Estados: `live` (en vivo ahora) / `next` (próxima fecha, hora local) / fallback estático.

## Assumptions (confirmables)

- Ventana en vivo = **1 hora** (19:00–20:00 UTC-3), constante configurable.
- Hora de origen fija **UTC-3** (Argentina sin DST) → el schedule se define en UTC.

## Capabilities

### New
- `live-banner`: banner de emisión en vivo con cómputo de hora local del visitante.

## Impact

- 5 templates + 404.html ganan el mismo markup del banner (igual al patrón nav global).
- `bundle-js` copia `src/live-banner.js` → `dist/live-banner.mjs`; templates agregan el
  `<script>`; `live-schedule.js` se importa desde `live-banner.js` y se testea con
  `node --test` (agregado a `check-tests`).
- CSS: `.live-banner` con estados `[data-state=live|next]`, sin JS-dependencia.
