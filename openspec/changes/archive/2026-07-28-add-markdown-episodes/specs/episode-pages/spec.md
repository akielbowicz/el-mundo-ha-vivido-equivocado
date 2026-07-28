## ADDED Requirements

### Requirement: Episode content from Markdown
The system SHALL compile Markdown files with frontmatter into static HTML pages.

#### Scenario: Build processes episode directory
- **GIVEN** a directory `episodios/` with `.md` files
- **WHEN** `just build` runs
- **THEN** each `.md` file is compiled to `dist/episodios/<slug>/index.html`
- **AND** invalid frontmatter causes the build to fail

#### Scenario: Frontmatter validation
- **GIVEN** an episode `.md` file with missing required frontmatter fields
- **WHEN** `just build` runs
- **THEN** the build fails with a descriptive error message

### Requirement: Episode frontmatter schema
Each episode `.md` file SHALL contain frontmatter with these fields.

#### Scenario: Required fields
- **GIVEN** an episode `.md` file
- **WHEN** parsed by the build pipeline
- **THEN** the frontmatter MUST include: `title`, `date` (ISO 8601), `description`, `authors`

#### Scenario: Status field
- **GIVEN** an episode `.md` file with `status: draft` in frontmatter
- **WHEN** `just build` runs
- **THEN** the episode is skipped (not rendered, not included in index or search)
- **AND** a message is printed: `file.md: status "draft" — skipped`
- **AND** the build exits successfully (non-draft episodes are unaffected)

#### Scenario: Status defaults to published
- **GIVEN** an episode `.md` file without a `status` field
- **WHEN** `just build` runs
- **THEN** the episode is treated as published and rendered normally

#### Scenario: Optional fields
- **GIVEN** an episode `.md` file
- **WHEN** parsed by the build pipeline
- **THEN** the frontmatter MAY include: `slug` (auto-generated from title if absent), `audio` (URL), `youtube` (URL or ID), `image` (URL), `image_alt` (string), `tags` (list)

#### Scenario: Slug auto-generation
- **GIVEN** an episode `.md` file without a `slug` in frontmatter
- **WHEN** the build runs
- **THEN** the slug is auto-generated from `title`: lowercase, spaces to hyphens, remove accents
- **AND** duplicate slug detection fails the build with conflicting file paths

#### Scenario: Duplicate slug detection
- **GIVEN** two or more episode `.md` files that produce the same slug
- **WHEN** the build runs
- **THEN** the build fails with an error listing the conflicting files

### Requirement: Episode page rendering
Episode pages SHALL be fully responsive, readable without JavaScript, and pass a11y validation.

#### Scenario: Responsive layout
- **GIVEN** an episode page
- **WHEN** viewed on a 320px-wide viewport
- **THEN** all content is readable without horizontal scroll

#### Scenario: No-JS content
- **GIVEN** an episode page
- **WHEN** JavaScript is disabled
- **THEN** all text content, audio player fallback, and images are visible

#### Scenario: Reader mode
- **GIVEN** an episode page
- **WHEN** opened in Firefox Reader Mode
- **THEN** the main episode content is readable

### Requirement: Audio playback
Episode pages SHALL provide an HTML5 audio player for the episode audio.

#### Scenario: Audio player renders
- **GIVEN** an episode with `audio` in frontmatter
- **WHEN** the page is loaded
- **THEN** an `<audio>` element with `controls` and `preload="metadata"` is rendered
- **AND** a direct download link is provided

#### Scenario: No audio fallback
- **GIVEN** an episode without `audio` in frontmatter
- **WHEN** the page is loaded
- **THEN** no audio player is shown
- **AND** no broken elements appear

### Requirement: YouTube video embedding
Episode pages SHALL embed YouTube videos with a11y-friendly markup.

#### Scenario: YouTube embed renders
- **GIVEN** an episode with `youtube` in frontmatter
- **WHEN** the page is loaded
- **THEN** a YouTube iframe is embedded with `loading="lazy"`
- **AND** the iframe has `title` attribute
- **AND** a direct link to the video is provided as fallback

#### Scenario: Invalid YouTube URL
- **GIVEN** an episode with a malformed `youtube` value in frontmatter
- **WHEN** the build runs
- **THEN** the build fails with an error indicating the invalid YouTube URL

### Requirement: Image support
Episode pages SHALL support images with alt text.

#### Scenario: Image renders with alt text
- **GIVEN** an episode with `image` and `image_alt` in frontmatter
- **WHEN** the page is loaded
- **THEN** an `<img>` element is rendered with `alt` set to `image_alt`
- **AND** the image is responsive (max-width 100%)

#### Scenario: Image without alt
- **GIVEN** an episode with `image` but no `image_alt` in frontmatter
- **WHEN** the page is loaded
- **THEN** the image is rendered with `alt=""` (decorative)

### Requirement: Episode index
The system SHALL generate an index page listing all episodes.

#### Scenario: Index lists all episodes
- **GIVEN** multiple episode `.md` files
- **WHEN** `just build` runs
- **THEN** `dist/episodios/index.html` lists all episodes sorted by date descending

### Requirement: Client-side search
The system SHALL provide a searchable index of episodes using vanilla JavaScript.

#### Scenario: Search index generated
- **GIVEN** episode `.md` files
- **WHEN** `just build` runs
- **THEN** a `dist/search-index.json` is generated with episode metadata

#### Scenario: Search filters episodes
- **GIVEN** a user on any page with JavaScript enabled
- **WHEN** they type in the search field
- **THEN** matching episodes are shown in real-time
- **AND** the search matches title, description, and authors using substring matching

#### Scenario: No-JS fallback
- **GIVEN** a user on any page with JavaScript disabled
- **WHEN** the page loads
- **THEN** a `<noscript>` link to `/episodios/` is shown instead of the search UI
- **AND** no broken elements appear