# episode-pages Specification (delta)

## MODIFIED Requirements

### Requirement: Episode content from Markdown
The system SHALL compile Markdown files with frontmatter into static HTML pages.

#### Scenario: Build processes episode directory
- **GIVEN** a directory `sitio/episodios/` with `.md` files
- **WHEN** `just build` runs
- **THEN** each `.md` file is compiled to `dist/episodios/<slug>/index.html`
- **AND** invalid frontmatter causes the build to fail

#### Scenario: Frontmatter validation
- **GIVEN** an episode `.md` file with missing required frontmatter fields
- **WHEN** `just build` runs
- **THEN** the build fails with a descriptive error message
