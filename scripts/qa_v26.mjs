/**
 * v2.6 QA — links, back-to-books clicks, responsive overflow, seller contrast, screenshots.
 * Usage: node scripts/qa_v26.mjs [baseUrl]
 */
import { chromium, webkit } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.argv[2] || "http://127.0.0.1:8765";
const SHOT = path.join(ROOT, "SCREENSHOTS-2.6");
const OUT = path.join(ROOT, "tests", "navigation", "v26-results.json");

const PAGES = [
  "index.html",
  "tum-yazilar.html",
  "haber.html",
  "tum-videolar.html",
  "tum-ingilizce-yazilar.html",
  "altin-olum.html",
  "altin-girdap.html",
  "o-soruyu-biz-sormayalim.html",
  "copler-faciasi.html",
  "altin-olum-satin-al.html",
  "altin-girdap-satin-al.html",
  "o-soruyu-biz-sormayalim-satin-al.html",
  "coplerFacyasi-satin-al.html",
];

const BOOK_BACK_PAGES = [
  "o-soruyu-biz-sormayalim-satin-al.html",
  "altin-olum-satin-al.html",
  "altin-girdap-satin-al.html",
  "coplerFacyasi-satin-al.html",
  "o-soruyu-biz-sormayalim.html",
  "altin-olum.html",
  "altin-girdap.html",
  "copler-faciasi.html",
];

const WIDTHS = [320, 360, 375, 390, 414, 430, 600, 768, 820, 834, 1024, 1180, 1280, 1440, 1920];

const CRITICAL_SHOTS = [
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 1440, theme: "light" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 1440, theme: "dark" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 1024, theme: "light" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 1024, theme: "dark" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 820, theme: "light" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 820, theme: "dark" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 390, theme: "light" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 390, theme: "dark" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 320, theme: "light" },
  { page: "o-soruyu-biz-sormayalim-satin-al.html", w: 320, theme: "dark" },
  { page: "o-soruyu-biz-sormayalim.html", w: 1440, theme: "light" },
  { page: "o-soruyu-biz-sormayalim.html", w: 1440, theme: "dark" },
  { page: "o-soruyu-biz-sormayalim.html", w: 820, theme: "light" },
  { page: "o-soruyu-biz-sormayalim.html", w: 390, theme: "dark" },
  { page: "index.html", w: 820, theme: "light" },
  { page: "index.html", w: 390, theme: "light" },
  { page: "index.html", w: 320, theme: "dark" },
];

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function relLuminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const L1 = relLuminance(fg);
  const L2 = relLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(str) {
  const m = String(str).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("ig-theme", t);
    } catch (_) {}
  }, theme);
}

async function logoInViewport(page) {
  return page.evaluate(() => {
    const logo = document.querySelector("header .logo");
    if (!logo) return { ok: false, reason: "missing" };
    const r = logo.getBoundingClientRect();
    const ok = r.left >= -1 && r.right <= window.innerWidth + 1 && r.width > 0;
    return { ok, left: r.left, right: r.right, width: r.width, vw: window.innerWidth };
  });
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    return { ok: sw <= iw + 1, scrollWidth: sw, innerWidth: iw };
  });
}

async function sellerContrast(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".seller-card h4, .purchase-link")];
    return cards.map((el) => {
      const cs = getComputedStyle(el);
      const color = cs.color;
      let bg = cs.backgroundColor;
      let node = el;
      while (node && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) {
        node = node.parentElement;
        if (!node) break;
        bg = getComputedStyle(node).backgroundColor;
      }
      return { text: el.textContent.trim(), color, bg };
    });
  });
}

async function sellerGridShape(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".seller-card")];
    if (!cards.length) return { count: 0 };
    const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top));
    const uniqueRows = [...new Set(tops)].length;
    const widths = cards.map((c) => Math.round(c.getBoundingClientRect().width));
    return { count: cards.length, rows: uniqueRows, widths };
  });
}

async function clickBackToBooks(page, label) {
  const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
  await link.click();
  await page.waitForURL(/index\.html#books/, { timeout: 8000 });
  // Hash landing re-aligns after dynamic content (up to ~2.8s in main.js)
  await page.waitForFunction(() => {
    const el = document.getElementById("books");
    const header = document.querySelector("header");
    if (!el) return false;
    const er = el.getBoundingClientRect();
    const hh = header ? header.getBoundingClientRect().bottom : 0;
    return er.top < window.innerHeight && er.bottom > hh && er.top >= hh - 24;
  }, { timeout: 5000 });
  const url = page.url();
  const section = await page.evaluate(() => {
    const el = document.getElementById("books");
    const header = document.querySelector("header");
    if (!el) return { ok: false, reason: "missing" };
    const er = el.getBoundingClientRect();
    const hh = header ? header.getBoundingClientRect().bottom : 0;
    return {
      ok: er.top < window.innerHeight && er.bottom > hh && er.top >= hh - 24,
      top: er.top,
      headerBottom: hh,
      notCovered: er.top >= hh - 24,
    };
  });
  return { url, section };
}

async function auditInternalLinks(page, pageFile) {
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && !h.startsWith("http") && !h.startsWith("mailto:") && !h.startsWith("tel:") && !h.startsWith("javascript:"))
  );
  const bad = [];
  for (const href of hrefs) {
    if (href.includes("ibrahim-gunduz.html")) {
      bad.push({ href, reason: "legacy-filename" });
      continue;
    }
    const clean = href.split("#")[0].split("?")[0];
    if (!clean || clean === "" || clean.startsWith("#")) continue;
    const res = await page.request.get(new URL(clean, `${BASE}/${pageFile}`).href);
    if (res.status() >= 400) bad.push({ href, status: res.status() });
  }
  return bad;
}

async function run() {
  ensureDir(SHOT);
  ensureDir(path.dirname(OUT));
  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    failures: [],
    backLinks: [],
    overflow: [],
    contrast: [],
    grids: [],
    screenshots: [],
    engines: {},
    linkAudit: [],
  };

  // Chromium primary
  const browser = await chromium.launch();
  try {
    // Back-to-books real clicks
    for (const pageFile of BOOK_BACK_PAGES) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${BASE}/${pageFile}`, { waitUntil: "networkidle" });
      const labels = pageFile.includes("satin")
        ? ["Tüm Kitaplara Dön", "Kitaplarıma Dön"]
        : ["Tüm Kitaplara Dön"];
      for (const label of labels) {
        try {
          await page.goto(`${BASE}/${pageFile}`, { waitUntil: "networkidle" });
          const result = await clickBackToBooks(page, label);
          const ok =
            /index\.html#books/.test(result.url) &&
            result.section.ok &&
            result.section.notCovered !== false;
          report.backLinks.push({ page: pageFile, label, ok, ...result });
          if (!ok) report.failures.push({ type: "back-link", page: pageFile, label, result });
        } catch (e) {
          report.failures.push({ type: "back-link-error", page: pageFile, label, error: String(e) });
        }
      }
      await context.close();
    }

    // Seller grid + contrast on purchase pages (light + dark)
    for (const pageFile of BOOK_BACK_PAGES.filter((p) => p.includes("satin"))) {
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto(`${BASE}/${pageFile}`, { waitUntil: "domcontentloaded" });
        await setTheme(page, theme);
        await page.waitForTimeout(200);
        const shape = await sellerGridShape(page);
        // At 1440 with 2x2: 4 cards → 2 rows (not 3+1)
        const gridOk =
          shape.count < 4 || shape.rows === 2 || (shape.count === 3 && shape.rows <= 2);
        report.grids.push({ page: pageFile, theme, ...shape, ok: gridOk });
        if (!gridOk) report.failures.push({ type: "seller-grid", page: pageFile, theme, shape });

        const sellers = await sellerContrast(page);
        for (const s of sellers) {
          const ratio = contrast(parseRgb(s.color), parseRgb(s.bg));
          const ok = ratio >= 4.5;
          report.contrast.push({ page: pageFile, theme, text: s.text, ratio: +ratio.toFixed(2), ok, color: s.color, bg: s.bg });
          if (!ok) report.failures.push({ type: "contrast", page: pageFile, theme, text: s.text, ratio });
        }
        await context.close();
      }
    }

    // Responsive overflow + logo for all widths on index + one purchase page
    for (const pageFile of ["index.html", "o-soruyu-biz-sormayalim-satin-al.html"]) {
      for (const w of WIDTHS) {
        const h = w <= 430 ? 844 : w <= 834 ? 1180 : 900;
        const context = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await context.newPage();
        await page.goto(`${BASE}/${pageFile}`, { waitUntil: "domcontentloaded" });
        const overflow = await noHorizontalOverflow(page);
        const logo = await logoInViewport(page);
        const row = { engine: "chromium", page: pageFile, width: w, overflow, logo, ok: overflow.ok && logo.ok };
        report.overflow.push(row);
        if (!row.ok) report.failures.push({ type: "overflow-or-logo", ...row });
        await context.close();
      }
    }

    // Internal link audit (no 404 / no legacy filename)
    for (const pageFile of PAGES) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${BASE}/${pageFile}`, { waitUntil: "domcontentloaded" });
      const bad = await auditInternalLinks(page, pageFile);
      report.linkAudit.push({ page: pageFile, bad });
      if (bad.length) report.failures.push({ type: "broken-internal", page: pageFile, bad });
      await context.close();
    }

    // Screenshots
    for (const shot of CRITICAL_SHOTS) {
      const h = shot.w <= 430 ? 844 : shot.w <= 834 ? 1180 : 900;
      const context = await browser.newContext({ viewport: { width: shot.w, height: h } });
      const page = await context.newPage();
      await page.goto(`${BASE}/${shot.page}`, { waitUntil: "networkidle" });
      await setTheme(page, shot.theme);
      await page.waitForTimeout(250);
      const name = `${shot.page.replace(/\.html$/, "")}_${shot.w}_${shot.theme}.png`;
      const dest = path.join(SHOT, name);
      await page.screenshot({ path: dest, fullPage: true });
      report.screenshots.push(path.relative(ROOT, dest));
      await context.close();
    }

    report.engines.chromium = "ok";
  } finally {
    await browser.close();
  }

  // WebKit subset (iPhone / iPad emulation — not a physical device claim)
  try {
    const wk = await webkit.launch();
    const cases = [
      { w: 390, h: 844, label: "iphone-ish" },
      { w: 768, h: 1024, label: "ipad-portrait" },
      { w: 820, h: 1180, label: "ipad-air" },
      { w: 1024, h: 768, label: "ipad-landscape" },
      { w: 1180, h: 820, label: "ipad-wide" },
    ];
    for (const c of cases) {
      for (const pageFile of ["index.html", "o-soruyu-biz-sormayalim-satin-al.html"]) {
        const context = await wk.newContext({ viewport: { width: c.w, height: c.h } });
        const page = await context.newPage();
        await page.goto(`${BASE}/${pageFile}`, { waitUntil: "domcontentloaded" });
        const overflow = await noHorizontalOverflow(page);
        const logo = await logoInViewport(page);
        const row = {
          engine: "webkit",
          label: c.label,
          page: pageFile,
          width: c.w,
          overflow,
          logo,
          ok: overflow.ok && logo.ok,
        };
        report.overflow.push(row);
        if (!row.ok) report.failures.push({ type: "webkit-overflow-or-logo", ...row });
        const name = `webkit_${c.label}_${pageFile.replace(/\.html$/, "")}_${c.w}.png`;
        const dest = path.join(SHOT, name);
        await page.screenshot({ path: dest, fullPage: true });
        report.screenshots.push(path.relative(ROOT, dest));
        await context.close();
      }
    }
    report.engines.webkit = "ok";
    await wk.close();
  } catch (e) {
    report.engines.webkit = `unavailable: ${e}`;
  }

  report.finishedAt = new Date().toISOString();
  report.ok = report.failures.length === 0;
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, failures: report.failures.length, out: OUT, shots: report.screenshots.length }, null, 2));
  if (report.failures.length) {
    console.log("--- failures (first 20) ---");
    console.log(JSON.stringify(report.failures.slice(0, 20), null, 2));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
