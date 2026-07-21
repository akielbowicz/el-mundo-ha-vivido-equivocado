dist:
    mkdir -p dist

install:
    npm install --silent

build: install dist
    set -eo pipefail; \
    npx squint compile && \
    cp resources/CNAME dist/

serve: install build
    npx serve dist -p 8080 --no-clipboard

watch: install
    npx squint watch

# Validate HTML + reader-mode compatibility (pre-commit)
check-html: install
    npx html-validate --config .htmlvalidate.json resources/index.html
    node scripts/check-reader-mode.mjs resources/index.html

# Full a11y audit against built site (pre-push)
check-a11y: install
    node scripts/a11y-audit.mjs

# Run all checks
check: check-html check-a11y

clean:
    rm -rf dist node_modules