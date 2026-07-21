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

clean:
    rm -rf dist node_modules