dist:
    mkdir -p dist

install:
    npm install --silent

build: install dist
    npx squint compile
    cp resources/CNAME dist/

serve: build
    npx serve dist -p 8080 --no-clipboard

watch:
    npx squint watch

clean:
    rm -rf dist node_modules