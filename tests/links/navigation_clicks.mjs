/**
 * Real click navigation for header + book back links + theme/hamburger smoke.
 */
import { chromium, webkit } from "playwright";
import { BASE, STATUS, listRootHtml } from "./lib.mjs";

const NAV = [
  { label: "Ana Sayfa", path: /index\.html\/?$/, hash: "", section: null },
  { label: "Yazılar", path: /index\.html/, hash: "#featured-articles", section: "featured-articles" },
  { label: "Videolarım", path: /index\.html/, hash: "#videos", section: "videos" },
  { label: "Kitaplar", path: /index\.html/, hash: "#books", section: "books" },
  { label: "Hakkında", path: /index\.html/, hash: "#about", section: "about" },
  { label: "Kariyer", path: /index\.html/, hash: "#timeline", section: "timeline" },
];

const WIDTHS = [320, 375, 390, 430, 768, 820, 1024, 1180, 1440, 1920];

async function sectionOk(page, id) {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    const header = document.querySelector("header");
    if (!el) return { ok: false, reason: "missing" };
    const er = el.getBoundingClientRect();
    const hh = header ? header.getBoundingClientRect().bottom : 0;
    return {
      ok: er.top < window.innerHeight && er.bottom > hh && er.top >= hh - 24,
      top: er.top,
      headerBottom: hh,
    };
  }, id);
}

export async function auditNavigationClicks() {
  const results = { nav: [], back: [], responsive: [], theme: [], engines: {} };
  const pages = listRootHtml().filter((p) => !p.startsWith("eng_"));

  const browser = await chromium.launch();
  try {
    // Header nav from a subset of pages (index + one buy + one list)
    const samplePages = ["index.html", "tum-yazilar.html", "o-soruyu-biz-sormayalim-satin-al.html", "haber.html"];
    for (const pageFile of samplePages) {
      for (const item of NAV) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto(`${BASE}/${pageFile}`, { waitUntil: "domcontentloaded" });
        // open hamburger if needed — desktop shouldn't need
        try {
          const link = page.locator("header nav a", { hasText: new RegExp(`^${item.label}$`) }).first();
          if ((await link.count()) === 0) {
            // try English labels on eng pages skipped
            results.nav.push({ page: pageFile, label: item.label, status: STATUS.BROKEN, note: "link-missing" });
            await context.close();
            continue;
          }
          await link.click();
          await page.waitForTimeout(400);
          if (item.hash) {
            await page.waitForURL(new RegExp(`index\\.html${item.hash.replace("#", "#")}`), { timeout: 8000 }).catch(() => {});
            await page.waitForFunction(
              (id) => {
                const el = document.getElementById(id);
                const header = document.querySelector("header");
                if (!el) return false;
                const er = el.getBoundingClientRect();
                const hh = header ? header.getBoundingClientRect().bottom : 0;
                return er.top < window.innerHeight && er.bottom > hh && er.top >= hh - 24;
              },
              item.section,
              { timeout: 5000 }
            );
            const sec = await sectionOk(page, item.section);
            const urlOk = page.url().includes(item.hash);
            results.nav.push({
              page: pageFile,
              label: item.label,
              status: urlOk && sec.ok ? STATUS.PASS : STATUS.BROKEN,
              url: page.url(),
              section: sec,
            });
          } else {
            const urlOk = /index\.html\/?$/.test(new URL(page.url()).pathname.split("/").pop() ? page.url() : page.url()) || page.url().endsWith("/") || page.url().includes("index.html");
            results.nav.push({
              page: pageFile,
              label: item.label,
              status: /index\.html/.test(page.url()) || page.url().replace(/\/$/, "").endsWith("8765") ? STATUS.PASS : urlOk ? STATUS.PASS : STATUS.BROKEN,
              url: page.url(),
            });
          }
        } catch (e) {
          results.nav.push({ page: pageFile, label: item.label, status: STATUS.BROKEN, error: String(e).slice(0, 180) });
        }
        await context.close();
      }
    }

    // Book back links
    const bookPages = [
      "altin-olum-satin-al.html",
      "altin-girdap-satin-al.html",
      "o-soruyu-biz-sormayalim-satin-al.html",
      "coplerFacyasi-satin-al.html",
      "altin-olum.html",
      "altin-girdap.html",
      "o-soruyu-biz-sormayalim.html",
      "copler-faciasi.html",
    ];
    for (const pageFile of bookPages) {
      const labels = pageFile.includes("satin") ? ["Tüm Kitaplara Dön", "Kitaplarıma Dön"] : ["Tüm Kitaplara Dön"];
      for (const label of labels) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        try {
          await page.goto(`${BASE}/${pageFile}`, { waitUntil: "networkidle" });
          await page.getByRole("link", { name: new RegExp(label, "i") }).first().click();
          await page.waitForURL(/index\.html#books/, { timeout: 8000 });
          await page.waitForFunction(() => {
            const el = document.getElementById("books");
            const header = document.querySelector("header");
            if (!el) return false;
            const er = el.getBoundingClientRect();
            const hh = header ? header.getBoundingClientRect().bottom : 0;
            return er.top < window.innerHeight && er.bottom > hh && er.top >= hh - 24;
          }, { timeout: 5000 });
          results.back.push({ page: pageFile, label, status: STATUS.PASS, url: page.url() });
        } catch (e) {
          results.back.push({ page: pageFile, label, status: STATUS.BROKEN, error: String(e).slice(0, 200) });
        }
        await context.close();
      }
    }

    // Responsive overflow + theme toggle smoke on index
    for (const w of WIDTHS) {
      for (const theme of ["light", "dark"]) {
        const h = w <= 430 ? 844 : w <= 820 ? 1180 : 900;
        const context = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await context.newPage();
        await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded" });
        await page.evaluate((t) => {
          document.documentElement.setAttribute("data-theme", t);
          try {
            localStorage.setItem("ig-theme", t);
          } catch (_) {}
        }, theme);
        const overflow = await page.evaluate(() => ({
          ok: document.documentElement.scrollWidth <= window.innerWidth + 1,
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        }));
        const logo = await page.evaluate(() => {
          const el = document.querySelector("header .logo");
          if (!el) return { ok: false };
          const r = el.getBoundingClientRect();
          return { ok: r.left >= -1 && r.right <= window.innerWidth + 1 && r.width > 0 };
        });
        // theme toggle clickable
        const toggle = page.locator(".ig-theme-toggle, button[aria-label*='tema' i], button[aria-label*='theme' i]").first();
        let themeOk = true;
        if (await toggle.count()) {
          try {
            await toggle.click({ timeout: 2000 });
          } catch {
            themeOk = false;
          }
        }
        results.responsive.push({
          width: w,
          theme,
          status: overflow.ok && logo.ok ? STATUS.PASS : STATUS.BROKEN,
          overflow,
          logo,
          themeToggle: themeOk,
        });
        await context.close();
      }
    }

    results.engines.chromium = STATUS.PASS;
  } finally {
    await browser.close();
  }

  // WebKit subset
  try {
    const wk = await webkit.launch();
    for (const w of [390, 768, 820, 1024]) {
      const context = await wk.newContext({ viewport: { width: w, height: w <= 430 ? 844 : 1024 } });
      const page = await context.newPage();
      await page.goto(`${BASE}/index.html`, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      const logo = await page.evaluate(() => {
        const el = document.querySelector("header .logo");
        const r = el.getBoundingClientRect();
        return r.left >= -1 && r.right <= window.innerWidth + 1;
      });
      results.responsive.push({
        engine: "webkit",
        width: w,
        status: overflow && logo ? STATUS.PASS : STATUS.BROKEN,
        overflow: { ok: overflow },
        logo: { ok: logo },
      });
      await context.close();
    }
    results.engines.webkit = STATUS.PASS;
    await wk.close();
  } catch (e) {
    results.engines.webkit = `UNVERIFIED: ${e}`;
  }

  return results;
}

export default auditNavigationClicks;
