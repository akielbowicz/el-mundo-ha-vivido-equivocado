## MODIFIED Requirements

### Requirement: Audio playback
Episode pages SHALL provide audio playback for the episode, from either an
explicit `audio` frontmatter URL or the discovered programa (full radio show)
recording. Explicit frontmatter SHALL take precedence; discovery SHALL act as
fallback.

#### Scenario: Audio player from frontmatter
- **GIVEN** an episode with `audio` in frontmatter
- **WHEN** the episode page is built
- **THEN** the `{{#audio}}` section renders (play button wired to the global
  player and a download link)
- **AND** the frontmatter URL is used even if a programa recording was also
  discovered

#### Scenario: Audio player from programa discovery
- **GIVEN** an episode without `audio` in frontmatter but with a programa
  recording available (local in `materiales/programas/` or published as a
  GitHub release)
- **WHEN** the episode page is built
- **THEN** the `audio` field is auto-populated from the discovered recording
- **AND** the `{{#audio}}` section renders as above

#### Scenario: Episode without recording
- **GIVEN** an episode with no `audio` frontmatter and no programa recording
  available
- **WHEN** the episode page is built
- **THEN** the page renders normally without an audio section
- **AND** the build exits successfully

#### Scenario: Discovery failure is graceful
- **GIVEN** the discovery source fails during the episodes build (e.g. GitHub
  API rate limit in CI)
- **WHEN** the episode pages are built
- **THEN** a warning is printed and pages render without the audio section
- **AND** the build exits successfully (only `build-programa.mjs`, which needs
  the actual files, fails hard)

#### Scenario: Matching by episode number
- **GIVEN** an episode file named `001-casas-hecker.md`
- **WHEN** the build discovers programa recordings
- **THEN** it matches the recording numbered `001` (e.g. `001-20260813.mp3`
  or release `episodio-001`)
- **AND** the edited `-dur` variant wins over the raw recording

#### Scenario: No-JS content
- **GIVEN** an episode page with audio (frontmatter or discovered)
- **WHEN** JavaScript is disabled
- **THEN** the download link is visible and functional
- **AND** all text content remains readable

## ADDED Requirements

### Requirement: Programa page redirects to episodes
The `/programa/` URL SHALL serve a redirect page to `/episodios/` while program
audio files remain served from their existing URLs.

#### Scenario: Redirect page
- **GIVEN** a visitor opens `/programa/`
- **WHEN** the page loads
- **THEN** it redirects to `/episodios/` via meta refresh
- **AND** a visible link to `/episodios/` is present for no-JS clients
- **AND** the page carries `noindex` so search engines skip it

#### Scenario: Redirect excluded from sitemap
- **GIVEN** the sitemap is generated after the build
- **WHEN** `/programa/index.html` is walked
- **THEN** it is excluded from sitemap.xml (meta-refresh stub detection)

#### Scenario: Audio URLs unchanged
- **GIVEN** a programa recording `001-20260813.mp3`
- **WHEN** the site is built
- **THEN** the file is served at `/programa/001-20260813.mp3`
