/**
 * Assert every htmlContent image under assets/ resolves with HTTP 200.
 * Usage: node tests/articles/content_images_404.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BASE = (process.argv[2] || "http://127.0.0.1:8777").replace(/\/$/, "");

const yazilar = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/yazilar.json"), "utf8"));
const srcRe = /src="([^"]+)"/gi;
const urls = new Set();
for (const a of yazilar) {
  const html = a.htmlContent || "";
  let m;
  while ((m = srcRe.exec(html))) {
    const u = m[1];
    if (!u || u.startsWith("http") || u.startsWith("data:")) continue;
    urls.add(u.split("#")[0].split("?")[0]);
  }
}

function headOk(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: "GET" }, (res) => {
      res.resume();
      resolve({ status: res.statusCode || 0 });
    });
    req.on("error", (e) => resolve({ status: 0, error: String(e.message || e) }));
    req.end();
  });
}

const missing = [];
let ok = 0;
for (const rel of [...urls].sort()) {
  const url = `${BASE}/${rel}`;
  const r = await headOk(url);
  if (r.status >= 200 && r.status < 300) ok += 1;
  else missing.push({ rel, status: r.status, error: r.error });
}

const list = [...urls];
const out = {
  base: BASE,
  uniqueImages: list.length,
  ok,
  missingCount: missing.length,
  missing: missing.slice(0, 20),
  stillPointingAtArticlesDir: list.filter((u) => u.includes("assets/images/articles/")).length,
  articleBodyCount: list.filter((u) => u.includes("article-body")).length,
};
console.log(JSON.stringify(out, null, 2));
if (missing.length || out.stillPointingAtArticlesDir) process.exit(1);
