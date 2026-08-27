# homepage Specification (delta)

The homepage is `dist/index.html` — the site root served at `/` (distinct from the
episodios listing at `/episodios/index.html`).

## ADDED Requirements

### Requirement: Homepage compiled from Markdown
The system SHALL compile the homepage from `sitio/index.md` (frontmatter + markdown
body) into `dist/index.html`, following the same markdown→HTML pipeline as episodes.

#### Scenario: Build processes homepage source
- **GIVEN** `sitio/index.md` with valid frontmatter
- **WHEN** `just build` runs
- **THEN** `dist/index.html` is generated from `sitio/index.md`
- **AND** no static `index.html` is copied from `resources/`

#### Scenario: Frontmatter validation
- **GIVEN** `sitio/index.md` missing required frontmatter fields
- **WHEN** `just build` runs
- **THEN** the build fails with a descriptive error message

#### Scenario: Frontmatter schema
- **GIVEN** `sitio/index.md`
- **WHEN** parsed by the build pipeline
- **THEN** the frontmatter MUST include: `title`, `description`
- **AND** the frontmatter MAY include: `tagline`

### Requirement: Dynamic hero section
The homepage SHALL render a hero section for the latest published episode, generated
from episode frontmatter — not hardcoded.

#### Scenario: Hero shows latest published episode
- **GIVEN** multiple published episodes in `sitio/episodios/` with different dates
- **WHEN** `just build` runs
- **THEN** the hero section shows the published episode with the latest date that is
  not in the future (date ≤ build date)
- **AND** links to `/episodios/<slug>/`

#### Scenario: Future-dated episode never appears in hero
- **GIVEN** a published episode with a date after the build date
- **WHEN** `just build` runs
- **THEN** that episode appears only in the "Próximas lecturas" section, never in the hero

#### Scenario: Build date is overridable
- **GIVEN** the `BUILD_DATE=YYYY-MM-DD` environment variable is set
- **WHEN** `just build` runs
- **THEN** hero and próximas section boundaries use that date instead of the machine's
  current date (reproducible builds)

#### Scenario: No published episodes
- **GIVEN** no episodes with `status: published`
- **WHEN** `just build` runs
- **THEN** the hero section is omitted
- **AND** the build succeeds

#### Scenario: Headings in index.md body are shifted
- **GIVEN** `sitio/index.md` with a body starting at `##` (and any level-1 headings)
- **WHEN** `just build` runs
- **THEN** body headings are rendered shifted one level down (same heading-shift
  behavior as episode pages)
- **AND** the page keeps a single `<h1>` (the site title from the template)

### Requirement: Dynamic próximas section
The homepage SHALL render upcoming readings from episodes with future dates.

#### Scenario: Próximas lists future episodes
- **GIVEN** published episodes with dates after the build date
- **WHEN** `just build` runs
- **THEN** the "Próximas lecturas" section lists them sorted by date ascending
- **AND** draft episodes never appear

### Requirement: Homepage a11y and reader-mode parity
The homepage SHALL meet the same accessibility guarantees as episode pages.

#### Scenario: Reader mode
- **GIVEN** the built homepage
- **WHEN** checked by `scripts/check-reader-mode.mjs`
- **THEN** it passes (single h1, semantic landmarks, meta description)

#### Scenario: A11y audit
- **GIVEN** the built homepage
- **WHEN** `node scripts/a11y-audit.mjs` runs
- **THEN** no accessibility errors are reported

#### Scenario: No-JS content
- **GIVEN** the homepage with JavaScript disabled
- **THEN** all editorial content, hero, and próximas sections are fully visible
- **AND** the search `<noscript>` fallback link to `/episodios/` is present
