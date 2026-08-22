# Project Context

## Purpose
Sitio web del programa de radio **"El mundo ha vivido equivocado"** donde leemos cuentos y comentamos la experiencia de la lectura.

## Tech Stack
- **Interactividad:** Squint (ClojureScript → vanilla JS) — player, búsqueda
- **Build pipeline:** Node `.mjs` (scripts/) orquestado con justfile
- **Audio:** Bash (`scripts/download-*`, `to-mp3`, `trim-audio`, `separate-vocals` con Demucs via uv)
- **OCR / extracción:** Python stdlib (`scripts/textos-from-images.py` con Gemini/OpenRouter, `extra/libros-ocr/`)
- **Deploy:** GitHub Actions → Pages (actions/deploy-pages@v4)
- **DNS:** Cloudflare (proxy naranja), delegado nic.ar
- **Validation:** html-validate, check-reader-mode.mjs, check-js.mjs (Playwright), lefthook
- **Issue tracking:** beads (bd)
- **Spec management:** OpenSpec

## Project Conventions

### Code Style
- HTML semántico completo, renderizado en servidor (no JS-dependiente)
- CSS con variables, diseño responsive mobile-first
- ClojureScript/Squint para lógica de realce (no para generar contenido)
- Contenido en Markdown (.md) y org-mode (.org) compilado a HTML en el build
- Markdown con frontmatter para contenido de episodios

### Architecture Patterns
- Contenido en HTML puro (recursos estáticos) + Markdown compilado a HTML
- Squint solo para interactividad mejorada (reproductor, búsqueda)
- Sin frameworks SPA — página tradicional con realce progresivo

### Testing Strategy
- html-validate con reglas WCAG a11y
- check-reader-mode.mjs para compatibilidad con Firefox Reader Mode
- Validación en pre-commit (lefthook), pre-push, y CI

### Git Workflow
- push a `main` → deploy automático a GH Pages
- Commits descriptivos en español

## Domain Context
- Programa de radio que lee cuentos y comenta la experiencia de lectura
- Cada episodio tiene: título, fecha, cuento/texto leído, audio (y opcionalmente video)
- El sitio debe funcionar sin JavaScript (lectura en modo avión, Firefox Reader Mode)
- Público hispanohablante

## Important Constraints
- Sin JavaScript no debe perder contenido legible
- Debe cumplir WCAG 2.1 AA
- Despliegue zero-ops via GitHub Pages
- Sin backend ni base de datos — sitio completamente estático

## External Dependencies
- GitHub Pages (hosting)
- Cloudflare (DNS + CDN)
- YouTube (embeds de video) — opcional, iframe
- Audio: archivos MP3/OGG hosteados externamente o en el repo