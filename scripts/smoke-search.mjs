/**
 * smoke-search.mjs — verbose debug version
 */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = 9876;
const DIST = "dist";
const MIME = {
  ".html": "text/html", ".mjs": "application/javascript",
  ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml",
};

function serve() {
  const server = createServer((req, res) => {
    let path = req.url === "/" ? "/index.html" : req.url;
    if (path.endsWith("/")) path += "index.html";
    const fp = join(DIST, path);
    const flat = join(DIST, req.url.replace(/\/$/, "") + ".html");
    if (existsSync(fp) && statSync(fp).isFile()) {
      res.writeHead(200, { "Content-Type": MIME[extname(fp)] || "application/octet-stream" });
      res.end(readFileSync(fp));
    } else if (existsSync(flat)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(readFileSync(flat));
    } else {
      const fb = join(DIST, "404.html");
      if (existsSync(fb)) { res.writeHead(404, { "Content-Type": "text/html" }); res.end(readFileSync(fb)); }
      else { res.writeHead(404); res.end("Not found"); }
    }
  });
  return new Promise(r => server.listen(PORT, () => r(server)));
}

async function main() {
  const server = await serve();
  let all = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("request", req => console.log("[REQ] " + req.url().replace("http://localhost:9876", "")));
  page.on("response", resp => console.log("[RES " + resp.status() + "] " + resp.url().replace("http://localhost:9876", "")));
  page.on("console", msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", err => console.log(`[PAGE_ERROR] ${err.message}`));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle", timeout: 8000 });
  await page.waitForTimeout(500);

  const input = page.locator("#search-input");
  await input.fill("borges");
  await page.waitForTimeout(1000);
  
  const hidden = await page.locator("#search-results").getAttribute("hidden");
  const count = await page.locator("#search-results li").count();

  console.log("Results hidden:", hidden);
  console.log("Result count:", count);
  console.log("\nAll console messages:");
  for (const m of all) console.log(" ", m);

  await browser.close();
  server.close();
  process.exit(hidden === null && count > 0 ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });