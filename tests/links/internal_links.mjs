/**
 * Inventory + validate internal href/src targets on local static server.
 */
import fs from "fs";
import path from "path";
import {
  ROOT,
  BASE,
  STATUS,
  listRootHtml,
  isExternal,
  isSkippable,
  stripHashQuery,
} from "./lib.mjs";

const ATTR_RE = /\b(?:href|src)=["']([^"']+)["']/gi;

export function collectFromFile(relPath) {
  const abs = path.join(ROOT, relPath);
  const text = fs.readFileSync(abs, "utf8");
  const found = [];
  let m;
  const re = new RegExp(ATTR_RE);
  while ((m = re.exec(text))) {
    found.push({ href: m[1], source: relPath, attr: m[0].startsWith("src") ? "src" : "href" });
  }
  return found;
}

function cleanExtractedUrl(raw) {
  let u = String(raw || "").trim();
  // Strip HTML / markdown junk that bleeds from htmlContent
  u = u.replace(/[<>"'].*$/, "");
  u = u.replace(/&amp;/g, "&");
  u = u.replace(/[),.;]+$/g, "");
  if (!/^https?:\/\//i.test(u)) return null;
  try {
    const parsed = new URL(u);
    if (parsed.pathname.includes("</") || parsed.pathname.includes("<")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function collectJsonUrls() {
  const files = [
    "assets/yazilar.json",
    "assets/eng-yazilar.json",
    "assets/videos.json",
    "assets/external-articles.json",
  ];
  const out = [];
  for (const f of files) {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    const urlRe = /https?:\/\/[^\s"'\\]+/g;
    let m;
    while ((m = urlRe.exec(text))) {
      const href = cleanExtractedUrl(m[0]);
      if (href) out.push({ href, source: f, attr: "json" });
    }
    try {
      const data = JSON.parse(text);
      const walk = (obj, trail) => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) return obj.forEach((x, i) => walk(x, `${trail}[${i}]`));
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v !== "string") {
            walk(v, `${trail}.${k}`);
            continue;
          }
          // fileName is a haber.html query key, not a static file path
          if (k === "fileName") continue;
          if (k === "htmlContent") continue;
          if (k === "link" || k === "thumbnail" || k === "url") {
            out.push({ href: v, source: `${f}:${trail}.${k}`, attr: "json-field" });
          } else walk(v, `${trail}.${k}`);
        }
      };
      walk(data, "$");
    } catch {
      /* ignore */
    }
  }
  return out;
}

export async function auditInternal(fetchFn) {
  const results = [];
  const occurrences = [];
  const htmlFiles = listRootHtml();
  for (const f of htmlFiles) {
    occurrences.push(...collectFromFile(f));
  }
  // JS that builds links
  for (const f of ["assets/js/articles.js", "assets/js/youtube-feed.js", "assets/js/main.js"]) {
    if (fs.existsSync(path.join(ROOT, f))) occurrences.push(...collectFromFile(f));
  }
  occurrences.push(...collectJsonUrls());

  const seenLocal = new Map(); // path -> [sources]
  for (const item of occurrences) {
    const href = item.href;
    if (isSkippable(href) || isExternal(href)) continue;
    // Ignore JS template placeholders and regex fragments scraped from source
    if (/\$\{/.test(href) || href.includes("([^") || href.includes("(?:") || /\.docx$/i.test(href)) {
      continue;
    }
    if (href.startsWith("#")) {
      // hash-only validated in navigation suite against known pages
      results.push({
        kind: "internal-hash",
        href,
        source: item.source,
        status: STATUS.PASS,
        note: "hash-only; page presence checked in navigation",
      });
      continue;
    }
    const clean = stripHashQuery(href);
    if (!clean) continue;
    if (!seenLocal.has(clean)) seenLocal.set(clean, []);
    seenLocal.get(clean).push(item.source);
  }

  for (const [clean, sources] of seenLocal.entries()) {
    // local filesystem check for assets
    const fsPath = path.join(ROOT, decodeURIComponent(clean));
    const isHtml = clean.endsWith(".html") || clean === "" || clean === "/";
    if (!isHtml && fs.existsSync(fsPath) && fs.statSync(fsPath).isFile()) {
      results.push({
        kind: "internal-asset",
        href: clean,
        sources,
        status: STATUS.PASS,
      });
      continue;
    }
    // HTTP check for pages/assets via server
    const url = new URL(clean, BASE + "/").href;
    try {
      const res = await fetchFn(url);
      const status = res.status() >= 400 ? STATUS.BROKEN : STATUS.PASS;
      results.push({
        kind: "internal-http",
        href: clean,
        sources,
        httpStatus: res.status(),
        status,
      });
    } catch (e) {
      results.push({
        kind: "internal-http",
        href: clean,
        sources,
        status: STATUS.BROKEN,
        error: String(e),
      });
    }
  }

  // Known section IDs on index
  const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  for (const id of ["featured-articles", "videos", "books", "about", "timeline"]) {
    const ok = new RegExp(`id=["']${id}["']`).test(indexHtml);
    results.push({
      kind: "section-id",
      href: `index.html#${id}`,
      status: ok ? STATUS.PASS : STATUS.BROKEN,
    });
  }

  // No legacy filename
  const legacy = occurrences.filter((o) => (o.href || "").includes("ibrahim-gunduz.html"));
  for (const L of legacy) {
    results.push({
      kind: "legacy-filename",
      href: L.href,
      source: L.source,
      status: STATUS.BROKEN,
    });
  }

  return { occurrences, results };
}

export default auditInternal;
