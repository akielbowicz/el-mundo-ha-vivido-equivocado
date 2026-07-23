/**
 * check-js.mjs
 *
 * Playwright-based smoke test for client-side JS.
 * Serves dist/, loads pages, and checks for console errors,
 * module load failures, and JS runtime errors.
 *
 * Usage: node scripts/check-js.mjs
 */

import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = 9876;
const DIST = "dist";
const MIME_TYPES = {
  ".html": "text/html",
  ".mjs": "application/javascript",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".epub": "application/epub+zip",
};

/* ── Static file server ──────────────── */

function serve() {
  const server = createServer((req, res) => {
    let url = new URL(req.url, `http://localhost:${PORT}`);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;

    // Strip trailing slash (directory index)
    if (path.endsWith("/")) path += "index.html";

    const filePath = join(DIST, path);
    if (!existsSync(filePath)) {
      // Try flat .html (e.g. /paginas/sobre/ → /paginas/sobre.html)
      const flatPath = join(DIST, url.pathname.replace(/\/$/, "") + ".html");
      if (existsSync(flatPath)) {
        const ext = extname(flatPath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/html" });
        res.end(readFileSync(flatPath));
        return;
      }
      // Try 404.html fallback
      const fallback = join(DIST, "404.html");
      if (existsSync(fallback)) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(readFileSync(fallback));
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(readFileSync(filePath));
  });

  return new Promise(resolve => {
    server.listen(PORT, () => {
      console.log(`  Test server on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

/* ── Tests ────────────────────────────── */

const PAGES = [
  { path: "/", name: "homepage" },
  { path: "/episodios/", name: "episodes index" },
  { path: "/episodios/el-aleph/", name: "episode detail" },
  { path: "/textos/", name: "textos index" },
  { path: "/textos/el-aleph-fragmento/", name: "texto detail" },
  { path: "/sobre/", name: "sobre page" },
  { path: "/contacto/", name: "contacto page" },
  { path: "/nonexistent", name: "404 page" },
];

async function runTests() {
  const server = await serve();
  let passed = 0;
  let failed = 0;
  const errors = [];

  const browser = await chromium.launch({ headless: true });

  for (const page of PAGES) {
    const ctx = await browser.newContext({ javaScriptEnabled: true });
    const tab = await ctx.newPage();
    const consoleErrors = [];
    let pageLoadError = null;

    tab.on("console", msg => {
      const text = msg.text();
      const loc = msg.location ? msg.location().url : "";
      if (msg.type() === "error" || msg.type() === "warning") {
        if (msg.type() === "error") {
          // Ignore CORS errors from external resources (CF Web Analytics on localhost)
          if (text.includes("cloudflareinsights") || text.includes("CORS") || text.includes("Access-Control-Allow-Origin") || text.includes("net::ERR_FAILED")) {
            return;
          }
          // Ignore 404 for the page itself (expected for 404 test)
          if (text.includes("404 (Not Found)") && loc.includes("nonexistent")) {
            return;
          }
          console.log(`  [console.error] ${text}`);
          if (loc) console.log(`    source: ${loc}`);
          consoleErrors.push(text);
        }
      }
    });

    tab.on("pageerror", err => {
      pageLoadError = err.message;
    });

    try {
      const url = `http://localhost:${PORT}${page.path}`;
      const resp = await tab.goto(url, { waitUntil: "networkidle", timeout: 5000 });

      // Don't follow meta refresh redirects — just check the initial status
      const status = resp ? resp.status() : 0;
      const hasErrors = consoleErrors.length > 0;
      const hasPageError = pageLoadError !== null;

      // 404 page should return 200 (it's the custom 404)
      const is404 = page.path === "/nonexistent";
      const statusOk = is404 ? status === 404 : status === 200;

      if (statusOk && !hasErrors && !hasPageError) {
        console.log(`  ✅ ${page.name} — ${status}`);
        passed++;
      } else {
        const issues = [];
        if (!statusOk) issues.push(`status ${status}`);
        if (hasErrors) issues.push(`${consoleErrors.length} console error(s)`);
        if (hasPageError) issues.push(`page error: ${pageLoadError}`);
        console.log(`  ❌ ${page.name} — ${issues.join(", ")}`);
        errors.push({ page: page.name, issues });
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ ${page.name} — ${err.message}`);
      errors.push({ page: page.name, issues: [err.message] });
      failed++;
    } finally {
      await tab.close();
      await ctx.close();
    }
  }

  await browser.close();
  server.close();

  console.log(`\n─── JS Smoke Test Summary ───`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    for (const err of errors) {
      console.log(`  - ${err.page}: ${err.issues.join("; ")}`);
    }
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});