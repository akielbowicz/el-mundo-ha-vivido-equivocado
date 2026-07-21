dist:
    mkdir -p dist

# Install dependencies
install:
    npm install --silent

# Build the site: compile squint source, copy CNAME + static assets to dist/
build: install dist
    npx squint compile
    cp resources/CNAME dist/

# Serve the built site locally on port 8080
serve: build
    npx serve dist -p 8080 --no-clipboard

# Watch source files and recompile on changes
watch:
    npx squint watch

# Clean build output
clean:
    rm -rf dist node_modules

.PHONY: install build serve watch clean
