/**
 * Capture v2.3 screenshots + optional main comparison.
 * Usage: node scripts/screenshot_2_3.mjs [devUrl] [mainUrl?]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "SCREENSHOTS-2.3");
const DEV = process.argv[2] || "http://127.0.0.1:8765";
const MAIN = process.argv[3] || null;

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "768", width: 768, height: 900 },
  { name: "375", width: 375, height: 812 },
  { name: "320", width: 320, height: 680 },
];

function ensure(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function shot(page, file) {
  ensure(path.dirname(file));
  await page.screenshot({ path: file, fullPage: true });
}

async function sectionShot(page, selector, file) {
  const el = page.locator(selector).first();
  if (await el.count()) {
    ensure(path.dirname(file));
    await el.screenshot({ path: file });
  }
}

async function captureTheme(browser, base, theme, folder) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await page.addInitScript((t) => localStorage.setItem("ig-theme", t), theme);
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(500);

    // Force theme attribute in case
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
    }, theme);

    const prefix = path.join(OUT, folder, theme);
    await shot(page, path.join(prefix, `home-full-${vp.name}.png`));

    if (vp.name === "1440" || vp.name === "375") {
      await sectionShot(page, "header", path.join(prefix, `header-${vp.name}.png`));
      await sectionShot(page, ".hero", path.join(prefix, `hero-${vp.name}.png`));
      await sectionShot(page, "#featured-articles", path.join(prefix, `articles-${vp.name}.png`));
      await sectionShot(page, "#videos", path.join(prefix, `videos-${vp.name}.png`));
      await sectionShot(page, "#books", path.join(prefix, `books-${vp.name}.png`));
      await sectionShot(page, "#about", path.join(prefix, `about-${vp.name}.png`));
      await sectionShot(page, "#timeline", path.join(prefix, `timeline-${vp.name}.png`));
      await sectionShot(page, "footer", path.join(prefix, `footer-${vp.name}.png`));
    }

    // computed evidence
    if (vp.name === "1440") {
      const styles = await page.evaluate(() => {
        const pick = (sel, props) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          const o = {};
          props.forEach((p) => (o[p] = cs[p]));
          return o;
        };
        return {
          refinementHref: [...document.styleSheets]
            .map((s) => s.href)
            .filter(Boolean)
            .find((h) => h.includes("refinement")),
          bodyFont: getComputedStyle(document.body).fontFamily,
          heroH1: pick(".hero h1", ["fontFamily", "fontSize", "letterSpacing"]),
          navBorder: pick("header nav", ["borderTopWidth", "borderTopColor"]),
          card: pick(".article-card", ["borderRadius", "boxShadow"]),
          articleImageH: pick(".article-image", ["height", "aspectRatio"]),
        };
      });
      fs.writeFileSync(path.join(prefix, `computed-1440.json`), JSON.stringify(styles, null, 2));
    }

    await context.close();
  }

  // book + articles pages
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript((t) => localStorage.setItem("ig-theme", t), theme);
  await page.goto(`${base}/altin-olum.html`, { waitUntil: "networkidle" });
  await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
  await shot(page, path.join(OUT, folder, theme, "book-detail-1440.png"));
  await page.goto(`${base}/tum-yazilar.html`, { waitUntil: "networkidle" });
  await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
  await shot(page, path.join(OUT, folder, theme, "tum-yazilar-1440.png"));
  await context.close();
}

async function main() {
  ensure(OUT);
  const browser = await chromium.launch({ headless: true });
  await captureTheme(browser, DEV, "light", "after");
  await captureTheme(browser, DEV, "dark", "after");
  if (MAIN) {
    await captureTheme(browser, MAIN, "light", "before-main");
    await captureTheme(browser, MAIN, "dark", "before-main");
  }
  await browser.close();
  console.log("Screenshots written to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
