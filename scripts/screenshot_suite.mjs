/**
 * Görsel test suite — Playwright.
 * Kullanım: node scripts/screenshot_suite.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const base = process.argv[2] || "http://127.0.0.1:8765";
const outDir = path.resolve("screenshots/after");
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 800 },
  { name: "375", width: 375, height: 812 },
  { name: "320", width: 320, height: 568 },
];

async function shot(page, file) {
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });
  console.log("saved", file);
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("ig-theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
  await page.reload({ waitUntil: "networkidle" });
}

async function measureNavBorder(page) {
  return page.evaluate(() => {
    const nav = document.querySelector("header nav");
    if (!nav) return null;
    const cs = getComputedStyle(nav);
    return { borderTopWidth: cs.borderTopWidth, borderTopColor: cs.borderTopColor, display: cs.display };
  });
}

const browser = await chromium.launch();
const page = await browser.newPage();
const report = [];

try {
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(base + "/index.html", { waitUntil: "networkidle" });
    await setTheme(page, "light");
    await shot(page, `home-light-${vp.name}.png`);
    await setTheme(page, "dark");
    const border = await measureNavBorder(page);
    report.push({ viewport: vp.name, theme: "dark", navBorder: border });
    await shot(page, `home-dark-${vp.name}.png`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + "/tum-videolar.html", { waitUntil: "networkidle" });
  await setTheme(page, "light");
  await shot(page, "videos-light-1440.png");
  await page.goto(base + "/tum-yazilar.html", { waitUntil: "networkidle" });
  await shot(page, "articles-light-1440.png");
  await page.goto(base + "/altin-olum.html", { waitUntil: "networkidle" });
  await setTheme(page, "dark");
  await shot(page, "book-dark-1440.png");

  fs.writeFileSync(path.join(outDir, "nav-border-report.json"), JSON.stringify(report, null, 2));
  console.log("nav border report", JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
