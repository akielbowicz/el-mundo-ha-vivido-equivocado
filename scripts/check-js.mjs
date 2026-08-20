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
  { path: "/nonexistent", name: "404 page" },
];

async function runTests() {
  const server = await serve();
  let passed = 0;
  let failed = 0;
  const errors = [];

  const browser = await chromium.launch({ headless: true });

  // Audio persistence test: set sessionStorage before navigation
  async function testAudioPersistence() {
    const ctx = await browser.newContext({ javaScriptEnabled: true });
    const tab = await ctx.newPage();

    // Set up sessionStorage before navigating to the episode page
    await tab.goto(`http://localhost:${PORT}/episodios/el-aleph/`, {
      waitUntil: "domcontentloaded",
      timeout: 5000,
    });
    await tab.evaluate(() => {
      sessionStorage.setItem("equivocadxs-audio", JSON.stringify({
        src: "/audio/el-aleph.mp3",
        title: "El Aleph",
        author: "Jorge Luis Borges",
        currentTime: 42,
        paused: true,
      }));
    });
    // Reload — player should restore state from sessionStorage
    await tab.reload({ waitUntil: "networkidle", timeout: 5000 });

    const playerVisible = await tab.evaluate(() => {
      const el = document.querySelector("#global-player");
      return el ? !el.hidden : false;
    });
    const playerTitle = await tab.evaluate(() => {
      const el = document.querySelector("#global-title");
      return el ? el.textContent : "";
    });
    const audioSrc = await tab.evaluate(() => {
      const el = document.querySelector("#global-audio");
      return el ? el.getAttribute("src") : "";
    });
    const preload = await tab.evaluate(() => {
      const el = document.querySelector("#global-audio");
      return el ? el.getAttribute("preload") : "";
    });

    await tab.close();
    await ctx.close();

    const checks = [
      { ok: playerVisible, msg: "player is visible" },
      { ok: playerTitle === "El Aleph", msg: `player title is "El Aleph" (got "${playerTitle}")` },
      { ok: audioSrc === "/audio/el-aleph.mp3", msg: `audio src is restored (got "${audioSrc}")` },
      { ok: preload === "metadata", msg: `preload is "metadata" (got "${preload}")` },
    ];

    const allOk = checks.every(c => c.ok);
    if (allOk) {
      console.log(`  ✅ audio persistence`);
      passed++;
    } else {
      const failures = checks.filter(c => !c.ok).map(c => c.msg);
      console.log(`  ❌ audio persistence — ${failures.join("; ")}`);
      errors.push({ page: "audio persistence", issues: failures });
      failed++;
    }
  }

  async function testNavLoader() {
    const ctx = await browser.newContext({ javaScriptEnabled: true });
    const tab = await ctx.newPage();

    await tab.goto(`http://localhost:${PORT}/episodios/el-aleph/`, {
      waitUntil: "networkidle",
      timeout: 5000,
    });

    const exists = await tab.evaluate(() =>
      !!document.querySelector(".nav-loader")
    );
    const hiddenByDefault = await tab.evaluate(() => {
      const el = document.querySelector(".nav-loader");
      return el ? el.hidden : true;
    });

    await tab.close();
    await ctx.close();

    const checks = [
      { ok: exists, msg: "nav-loader element exists" },
      { ok: hiddenByDefault, msg: "nav-loader is hidden on page load" },
    ];

    const allOk = checks.every(c => c.ok);
    if (allOk) {
      console.log(`  ✅ nav loader`);
      passed++;
    } else {
      const failures = checks.filter(c => !c.ok).map(c => c.msg);
      console.log(`  ❌ nav loader — ${failures.join("; ")}`);
      errors.push({ page: "nav loader", issues: failures });
      failed++;
    }
  }

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
          if (text.includes("cloudflareinsights") || (text.includes("net::ERR_FAILED") && loc.includes("cloudflareinsights"))) {
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

  await testAudioPersistence();
  await testNavLoader();

  // Dynamically discover and test a texto detail page
  await (async function testTextoDetail() {
    const ctx = await browser.newContext({ javaScriptEnabled: true });
    const tab = await ctx.newPage();

    try {
      // Fetch textos index to find texto detail links
      await tab.goto(`http://localhost:${PORT}/textos/`, {
        waitUntil: "networkidle",
        timeout: 5000,
      });

      const links = await tab.evaluate(() => {
        const list = document.querySelectorAll('[data-filter-container] a[href^="/textos/"]');
        return [...list].map(a => a.getAttribute("href"));
      });

      if (links.length === 0) {
        console.log(`  ⚠  no texto detail links found — skipping`);
        return;
      }

      const detailUrl = `http://localhost:${PORT}${links[0]}`;
      const resp = await tab.goto(detailUrl, { waitUntil: "networkidle", timeout: 5000 });
      const status = resp ? resp.status() : 0;

      if (status === 200) {
        console.log(`  ✅ texto detail — ${status}`);
        passed++;
      } else {
        console.log(`  ❌ texto detail — status ${status}`);
        errors.push({ page: "texto detail", issues: [`status ${status}`] });
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ texto detail — ${err.message}`);
      errors.push({ page: "texto detail", issues: [err.message] });
      failed++;
    } finally {
      await tab.close();
      await ctx.close();
    }
  })();

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