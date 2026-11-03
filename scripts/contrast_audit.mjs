/**
 * Computed-style contrast audit for critical selectors (WCAG 2.2 AA approx).
 * Usage: node scripts/contrast_audit.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "SCREENSHOTS-2.5");
const BASE = process.argv[2] || "http://127.0.0.1:8765";

function parseColor(c) {
  const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
}

function relLum({ r, g, b }) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg, bg) {
  const L1 = relLum(fg);
  const L2 = relLum(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function blend(fg, bg) {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

async function sample(page, selector) {
  return page.evaluate((sel) => {
    function parse(c) {
      const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    }
    function blend(fg, bg) {
      const a = fg.a;
      return {
        r: Math.round(fg.r * a + bg.r * (1 - a)),
        g: Math.round(fg.g * a + bg.g * (1 - a)),
        b: Math.round(fg.b * a + bg.b * (1 - a)),
        a: 1,
      };
    }
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const pageBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    let acc = pageBg;
    const chain = [];
    let n = el;
    while (n) {
      chain.unshift(n);
      n = n.parentElement;
    }
    for (const node of chain) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (!bg) continue;
      if (bg.a === 0) continue;
      acc = bg.a < 1 ? blend(bg, acc) : bg;
    }
    const fontSize = parseFloat(cs.fontSize) || 16;
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    return {
      selector: sel,
      color: cs.color,
      backgroundColor: `rgb(${acc.r}, ${acc.g}, ${acc.b})`,
      fontSize,
      bold,
      text: (el.innerText || "").slice(0, 80),
    };
  }, selector);
}

const PAGES = [
  { path: "index.html", sels: [".hero h1", ".hero-text p", ".section-title", ".book-buy-btn", ".book-read-more", "header nav a", "footer"] },
  { path: "o-soruyu-biz-sormayalim.html", sels: [".book-description p", ".purchase-link", ".book-detail-info h1", ".purchase-title"] },
  { path: "altin-olum-satin-al.html", sels: [".seller-card h4", ".book-description-full p", ".seller-btn"] },
  { path: "altin-olum.html", sels: [".book-description p", ".purchase-link"] },
];

async function auditTheme(browser, theme) {
  const failures = [];
  const rows = [];
  for (const pageDef of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript((t) => localStorage.setItem("ig-theme", t), theme);
    await page.goto(`${BASE}/${pageDef.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    await page.waitForTimeout(400);
    for (const sel of pageDef.sels) {
      const s = await sample(page, sel);
      if (!s) {
        rows.push({ page: pageDef.path, theme, selector: sel, status: "missing" });
        continue;
      }
      const fg = parseColor(s.color);
      let bg = parseColor(s.backgroundColor) || { r: 16, g: 25, b: 33, a: 1 };
      if (fg && fg.a < 1) {
        // blend onto bg
      }
      if (!fg) {
        rows.push({ ...s, page: pageDef.path, theme, status: "unparsed", ratio: null });
        continue;
      }
      if (fg.a < 1) {
        Object.assign(fg, { r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)), g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)), b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)), a: 1 });
      }
      if (bg.a < 1) bg = blend(bg, { r: 16, g: 25, b: 33, a: 1 });
      const ratio = contrast(fg, bg);
      const large = s.fontSize >= 24 || (s.fontSize >= 18.66 && s.bold);
      const need = large ? 3 : 4.5;
      const ok = ratio >= need;
      const row = { page: pageDef.path, theme, selector: sel, ratio: +ratio.toFixed(2), need, ok, color: s.color, backgroundColor: s.backgroundColor, text: s.text };
      rows.push(row);
      if (!ok) failures.push(row);
    }
    // screenshots for book page
    if (pageDef.path.includes("o-soruyu") || pageDef.path === "index.html") {
      fs.mkdirSync(path.join(OUT, theme), { recursive: true });
      await page.screenshot({ path: path.join(OUT, theme, pageDef.path.replace(".html", "") + "-1440.png"), fullPage: true });
    }
    await ctx.close();
  }
  return { rows, failures };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const light = await auditTheme(browser, "light");
  const dark = await auditTheme(browser, "dark");
  await browser.close();
  const report = {
    base: BASE,
    lightFailures: light.failures,
    darkFailures: dark.failures,
    lightFailCount: light.failures.length,
    darkFailCount: dark.failures.length,
    rows: [...light.rows, ...dark.rows],
  };
  fs.writeFileSync(path.join(OUT, "contrast-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ lightFailCount: report.lightFailCount, darkFailCount: report.darkFailCount, darkFailures: report.darkFailures }, null, 2));
  if (report.darkFailCount > 0 || report.lightFailCount > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
