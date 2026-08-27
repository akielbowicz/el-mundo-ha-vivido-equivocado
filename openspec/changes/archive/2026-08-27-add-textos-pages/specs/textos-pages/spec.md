## ADDED Requirements

### Requirement: Textos from Markdown
The system SHALL compile Markdown files with frontmatter from `textos/` into static HTML pages, parallel to the episode system.

#### Scenario: Build processes textos directory
- **GIVEN** a directory `textos/` with `.md` files
- **WHEN** `just build` runs
- **THEN** each `.md` file is compiled to `dist/textos/<slug>/index.html`
- **AND** invalid frontmatter causes the build to fail

#### Scenario: Status filtering
- **GIVEN** a texto `.md` file with `status: draft` in frontmatter
- **WHEN** `just build` runs
- **THEN** the texto is skipped (same behavior as episodes)

### Requirement: Textos frontmatter schema
Each texto `.md` file SHALL contain frontmatter with these fields.

#### Scenario: Required fields
- **GIVEN** a texto `.md` file
- **WHEN** parsed by the build pipeline
- **THEN** the frontmatter MUST include: `title`, `author`, `date`, `genre`

#### Scenario: Optional fields
- **GIVEN** a texto `.md` file
- **WHEN** parsed by the build pipeline
- **THEN** the frontmatter MAY include: `slug` (auto-generated), `license`, `tags` (list), `episode_slug` (for linking to related episode)

### Requirement: Textos index page
The system SHALL generate an index page listing all published textos.

#### Scenario: Index lists all textos
- **GIVEN** multiple texto `.md` files
- **WHEN** `just build` runs
- **THEN** `dist/textos/index.html` lists all textos sorted by date descending
- **AND** each entry shows title, author, genre, date

### Requirement: EPUB export
The system SHALL generate EPUB files for each published texto and episode at build time.

#### Scenario: EPUB generated for each texto
- **GIVEN** a published texto `.md` file
- **WHEN** `just build` runs
- **THEN** `dist/textos/<slug>/<slug>.epub` is generated
- **AND** the EPUB includes title, author, language (es), date, cover image, table of contents

#### Scenario: EPUB includes embedded images
- **GIVEN** a texto with images in the markdown
- **WHEN** the EPUB is generated
- **THEN** images are downloaded and embedded locally in the EPUB
- **AND** images render correctly on Kindle without network access

#### Scenario: Download link on page
- **GIVEN** a published texto or episode page
- **WHEN** the page is rendered
- **THEN** an "Descargar EPUB" link is shown pointing to the `.epub` file

### Requirement: PDF export via print
The system SHALL provide a print button that triggers the browser's print dialog (which can save as PDF).

#### Scenario: Print button renders
- **GIVEN** a published texto or episode page
- **WHEN** the page is loaded
- **THEN** a "Imprimir / PDF" button is shown
- **AND** clicking it calls `window.print()`

#### Scenario: Print styles hide media
- **GIVEN** a page with audio player, video embed, and navigation
- **WHEN** printed
- **THEN** `.episode-audio`, `.episode-video`, `.episode-nav` are hidden
- **AND** the main content flows cleanly on the page

### Requirement: Visit metrics
The system SHALL include Cloudflare Web Analytics for privacy-friendly visit tracking.

#### Scenario: Analytics snippet present
- **GIVEN** any page of the site
- **WHEN** loaded
- **THEN** the Cloudflare Web Analytics snippet is present in the `<head>`
- **AND** no cookies are set by the analytics

### Requirement: Navigation between texts
The system SHALL provide prev/next navigation between textos.

#### Scenario: Prev/next on texto page
- **GIVEN** a published texto page
- **WHEN** loaded
- **THEN** prev/next links are shown based on chronological order (same as episodes)