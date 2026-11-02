/**
 * Playwright navigation suite — real clicks, URL, DOM, visibility.
 * Usage: node scripts/nav_test.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "tests", "navigation");
const BASE = process.argv[2] || "http://127.0.0.1:8765";

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

const NAV = [
  { label: "Ana Sayfa", expectPath: /index\.html\/?$/, expectHash: "", section: null },
  { label: "Yazılar", expectPath: /index\.html/, expectHash: "#featured-articles", section: "featured-articles" },
  { label: "Videolarım", expectPath: /index\.html/, expectHash: "#videos", section: "videos" },
  { label: "Kitaplar", expectPath: /index\.html/, expectHash: "#books", section: "books" },
  { label: "Hakkında", expectPath: /index\.html/, expectHash: "#about", section: "about" },
  { label: "Kariyer", expectPath: /index\.html/, expectHash: "#timeline", section: "timeline" },
];

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function headerHeight(page) {
  return page.evaluate(() => {
    const h = document.querySelector("header");
    return h ? h.getBoundingClientRect().height : 0;
  });
}

async function sectionVisibleBelowHeader(page, id) {
  return page.evaluate(({ id }) => {
    const el = document.getElementById(id);
    const header = document.querySelector("header");
    if (!el) return { ok: false, reason: "missing" };
    const er = el.getBoundingClientRect();
    const hh = header ? header.getBoundingClientRect().bottom : 0;
    const inView = er.top < window.innerHeight && er.bottom > hh + 4;
    const notCovered = er.top >= hh - 8;
    return { ok: inView && notCovered, top: er.top, headerBottom: hh, inView, notCovered };
  }, { id });
}

async function clickNav(page, label) {
  const link = page.locator("header nav a", { hasText: new RegExp(`^${label}$`) }).first();
  await link.click();
}

async function runCase(browser, pageFile, item, theme, mobile) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    colorScheme: theme === "dark" ? "dark" : "light",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedAssets = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("127.0.0.1") || u.includes("localhost")) {
      if (res.status() >= 400 && /\.(css|js|png|jpg|jpeg|svg|json|webp)$/i.test(u)) {
        failedAssets.push(`${res.status()} ${u}`);
      }
    }
  });

  await page.addInitScript((t) => {
    localStorage.setItem("ig-theme", t);
  }, theme);

  const startUrl = `${BASE}/${pageFile}`;
  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  // CSS loaded?
  const refinementOk = await page.evaluate(async () => {
    const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) =>
      (l.href || "").includes("refinement.css")
    );
    if (!link) return { ok: false, reason: "no-link" };
    try {
      const r = await fetch(link.href, { cache: "no-store" });
      return { ok: r.ok, status: r.status, href: link.href };
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
  });

  if (mobile) {
    const btn = page.locator(".mobile-menu-btn");
    if (await btn.isVisible()) await btn.click();
  }

  const before = page.url();
  await clickNav(page, item.label);
  // Wait for navigation + late layout (articles/videos JSON)
  await page.waitForTimeout(item.section ? 2200 : 500);
  if (item.section) {
    await page.waitForFunction(
      (id) => {
        const el = document.getElementById(id);
        const header = document.querySelector("header");
        if (!el) return false;
        const er = el.getBoundingClientRect();
        const hh = header ? header.getBoundingClientRect().bottom : 0;
        return er.top < window.innerHeight && er.bottom > hh + 4 && er.top >= hh - 24;
      },
      item.section,
      { timeout: 8000 }
    ).catch(() => {});
  }
  const after = page.url();
  const u = new URL(after);

  const pathOk = item.expectPath.test(u.pathname + (u.pathname.endsWith("/") ? "" : "")) ||
    item.expectPath.test(u.pathname) ||
    (item.label === "Ana Sayfa" && /index\.html\/?$/.test(u.pathname));
  // Playwright URL pathname often ends with /index.html
  const pathPass =
    item.label === "Ana Sayfa"
      ? /index\.html\/?$/.test(u.pathname) || u.pathname.endsWith("/")
      : /index\.html/.test(u.pathname) || u.pathname.endsWith("/");
  const hashPass = item.expectHash ? u.hash === item.expectHash : u.hash === "" || u.hash === "#";

  let sectionPass = true;
  let sectionDetail = null;
  if (item.section) {
    await page.waitForSelector(`#${item.section}`, { timeout: 10000 });
    sectionDetail = await sectionVisibleBelowHeader(page, item.section);
    sectionPass = !!sectionDetail.ok;
  }

  // Computed styles sample on index landings
  let computed = null;
  if (item.section === "videos" || pageFile === "index.html") {
    computed = await page.evaluate(() => {
      const nav = document.querySelector("header nav");
      const card = document.querySelector(".article-card");
      const heroH1 = document.querySelector(".hero h1");
      const cs = (el) => (el ? getComputedStyle(el) : null);
      return {
        navBorderTop: nav ? cs(nav).borderTopWidth : null,
        heroFont: heroH1 ? cs(heroH1).fontFamily : null,
        cardRadius: card ? cs(card).borderRadius : null,
        bodyFont: cs(document.body).fontFamily,
      };
    });
  }

  await context.close();

  const ok = pathPass && hashPass && sectionPass && refinementOk.ok;
  return {
    page: pageFile,
    label: item.label,
    theme,
    mobile,
    ok,
    before,
    after,
    pathPass,
    hashPass,
    sectionPass,
    sectionDetail,
    refinementOk,
    computed,
    consoleErrors: consoleErrors.slice(0, 5),
    failedAssets: failedAssets.slice(0, 8),
  };
}

async function logoTest(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/altin-olum.html`, { waitUntil: "domcontentloaded" });
  await page.locator("header a.logo").click();
  await page.waitForTimeout(400);
  const ok = /index\.html\/?$/.test(new URL(page.url()).pathname) || page.url().endsWith("/");
  await context.close();
  return { name: "logo-to-home", ok, url: page.url() };
}

async function hashReloadTest(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/index.html#videos`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const vis = await sectionVisibleBelowHeader(page, "videos");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const vis2 = await sectionVisibleBelowHeader(page, "videos");
  const hashKept = new URL(page.url()).hash === "#videos";
  await context.close();
  return { name: "hash-reload", ok: vis.ok && vis2.ok && hashKept, vis, vis2, hashKept };
}

async function backForwardTest(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/altin-olum.html`, { waitUntil: "domcontentloaded" });
  await page.locator("header nav a", { hasText: /^Videolarım$/ }).click();
  await page.waitForTimeout(700);
  await page.goBack();
  await page.waitForTimeout(400);
  const backOk = page.url().includes("altin-olum.html");
  await page.goForward();
  await page.waitForTimeout(700);
  const fwdOk = page.url().includes("index.html") && page.url().includes("#videos");
  await context.close();
  return { name: "back-forward", ok: backOk && fwdOk, backOk, fwdOk };
}

async function main() {
  ensureDir(OUT);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // Critical matrix: all pages × all nav (desktop light)
  for (const pageFile of PAGES) {
    for (const item of NAV) {
      const r = await runCase(browser, pageFile, item, "light", false);
      results.push(r);
      const mark = r.ok ? "PASS" : "FAIL";
      console.log(`${mark} ${pageFile} → ${item.label} → ${r.after}`);
      if (!r.ok) console.log("  detail", JSON.stringify({ pathPass: r.pathPass, hashPass: r.hashPass, sectionPass: r.sectionPass, sectionDetail: r.sectionDetail }, null, 0));
    }
  }

  // Extra: dark + mobile for book page Videolarım
  for (const theme of ["light", "dark"]) {
    for (const mobile of [false, true]) {
      const r = await runCase(browser, "altin-olum.html", NAV.find((n) => n.label === "Videolarım"), theme, mobile);
      results.push({ ...r, suite: "altin-olum-videos-matrix" });
      console.log(`${r.ok ? "PASS" : "FAIL"} matrix altin-olum Videolarım ${theme} mobile=${mobile}`);
    }
  }

  const extras = [];
  extras.push(await logoTest(browser));
  extras.push(await hashReloadTest(browser));
  extras.push(await backForwardTest(browser));

  // Horizontal overflow check
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  extras.push({ name: "mobile-no-h-scroll", ok: !overflow, overflow });
  await ctx.close();

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  const extraFailed = extras.filter((e) => !e.ok);
  const summary = {
    base: BASE,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    extras,
    extraFailed: extraFailed.length,
    failedCases: failed,
    sampleComputed: results.find((r) => r.computed)?.computed || null,
  };

  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ summary, results, extras }, null, 2));
  fs.writeFileSync(
    path.join(OUT, "summary.md"),
    `# Navigation test summary\n\nBase: ${BASE}\n\nPassed: ${summary.passed}/${summary.total}\nExtras failed: ${summary.extraFailed}\n\n` +
      (failed.length
        ? failed.map((f) => `- FAIL ${f.page} / ${f.label} → ${f.after}`).join("\n")
        : "All header navigation cases passed.\n") +
      `\n\nExtras:\n` +
      extras.map((e) => `- ${e.ok ? "PASS" : "FAIL"} ${e.name}`).join("\n") +
      `\n`
  );

  console.log("\nSUMMARY", summary.passed + "/" + summary.total, "extrasFail", summary.extraFailed);
  if (failed.length || extraFailed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
