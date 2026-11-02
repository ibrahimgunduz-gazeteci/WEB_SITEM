/**
 * Content matching: 72 articles, 4 books, videos.json, English entries.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import {
  ROOT,
  BASE,
  STATUS,
  readJson,
  youtubeIdFromUrl,
} from "./lib.mjs";

const BOOKS = [
  {
    key: "altin-olum",
    title: "Altın Ölüm",
    year: "2020",
    detail: "altin-olum.html",
    buy: "altin-olum-satin-al.html",
    cover: "assets/images/books/altinolum.jpeg",
  },
  {
    key: "altin-girdap",
    title: "Altın Girdap",
    year: "2022",
    detail: "altin-girdap.html",
    buy: "altin-girdap-satin-al.html",
    cover: "assets/images/books/altingirdap.jpeg",
  },
  {
    key: "o-soruyu",
    title: "O Soruyu Biz Sormayalım",
    year: "2022",
    detail: "o-soruyu-biz-sormayalim.html",
    buy: "o-soruyu-biz-sormayalim-satin-al.html",
    cover: "assets/images/books/osoruyubizsormayalim.jpg",
  },
  {
    key: "copler",
    title: "Çöpler Faciası",
    year: "2024",
    detail: "copler-faciasi.html",
    buy: "coplerFacyasi-satin-al.html",
    cover: "assets/images/books/copler_faciasi.jpeg",
  },
];

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function auditContentMatching() {
  const results = { articles: [], books: [], videos: [], english: [], fixesNoted: [] };
  const browser = await chromium.launch();

  try {
    // --- 72 articles ---
    const yazilar = readJson("assets/yazilar.json");
    results.articleCount = yazilar.length;
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const art of yazilar) {
      const fileName = art.fileName;
      const title = art.title;
      const thumb = art.thumbnail;
      const row = {
        fileName,
        title,
        status: STATUS.PASS,
        checks: {},
      };

      row.checks.uniqueName = Boolean(fileName);
      row.checks.thumbExists = thumb ? fs.existsSync(path.join(ROOT, thumb)) : false;
      if (!row.checks.thumbExists) {
        row.status = STATUS.BROKEN;
        row.note = "missing-thumbnail";
      }

      const url = `${BASE}/haber.html?file=${encodeURIComponent(fileName)}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(150);
        const shown = await page.locator("h1.article-title, h1, .article-title").first().textContent().catch(() => "");
        const bodyText = await page.locator(".article-content, main, article").first().innerText().catch(() => "");
        const shownN = normalize(shown);
        const titleN = normalize(title);
        // Match: page title equals record OR record title appears in body
        const titleMatch =
          shownN === titleN ||
          shownN.includes(titleN.slice(0, Math.min(40, titleN.length))) ||
          normalize(bodyText).includes(titleN.slice(0, Math.min(40, titleN.length)));
        row.checks.pageLoaded = true;
        row.checks.titleMatch = titleMatch;
        row.shownTitle = (shown || "").slice(0, 120);
        if (!titleMatch) {
          // empty/error page?
          const err = /bulunamad|not found|yüklenemedi|error/i.test(shown + bodyText);
          row.status = err ? STATUS.BROKEN : STATUS.MISMATCH;
          row.note = err ? "article-not-found" : "title-mismatch";
        }
        // content not empty
        if ((bodyText || "").trim().length < 20) {
          row.status = STATUS.BROKEN;
          row.note = "empty-body";
        }
      } catch (e) {
        row.status = STATUS.BROKEN;
        row.note = String(e).slice(0, 200);
        row.checks.pageLoaded = false;
      }
      results.articles.push(row);
    }
    await context.close();

    // --- books on index + detail/buy consistency ---
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage();
    for (const b of BOOKS) {
      const row = { key: b.key, title: b.title, status: STATUS.PASS, checks: {} };
      row.checks.coverExists = fs.existsSync(path.join(ROOT, b.cover));
      row.checks.detailExists = fs.existsSync(path.join(ROOT, b.detail));
      row.checks.buyExists = fs.existsSync(path.join(ROOT, b.buy));

      await p2.goto(`${BASE}/index.html#books`, { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(200);
      const card = p2.locator(`#books .book-card`, { has: p2.locator(".book-title", { hasText: b.title }) }).first();
      row.checks.cardVisible = (await card.count()) > 0;
      if (row.checks.cardVisible) {
        const yearText = await card.locator(".book-year").textContent();
        row.checks.yearMatch = (yearText || "").trim() === b.year;
        const detailHref = await card.locator("a.book-read-more").getAttribute("href");
        const buyHref = await card.locator("a.book-buy-btn").getAttribute("href");
        row.checks.detailHref = detailHref === b.detail;
        row.checks.buyHref = buyHref === b.buy;
        const img = await card.locator("img").getAttribute("src");
        row.checks.coverHref = img === b.cover;
      }

      // detail page year + title
      await p2.goto(`${BASE}/${b.detail}`, { waitUntil: "domcontentloaded" });
      const dh1 = await p2.locator("h1").first().textContent();
      row.checks.detailTitle = normalize(dh1).includes(normalize(b.title).slice(0, 12));
      const meta = await p2.locator(".book-meta").innerText().catch(() => "");
      row.checks.detailYear = meta.includes(b.year);

      await p2.goto(`${BASE}/${b.buy}`, { waitUntil: "domcontentloaded" });
      const bh1 = await p2.locator("h1").first().textContent();
      row.checks.buyTitle = normalize(bh1).includes(normalize(b.title).slice(0, 12));
      const badge = await p2.locator(".book-year-badge").textContent().catch(() => "");
      row.checks.buyYear = (badge || "").trim() === b.year;

      // seller links should not be publisher homepage alone for Galeati when product known
      const galeati = await p2.locator('a[href*="galeatiyayinevi.com"]').all();
      for (const a of galeati) {
        const href = await a.getAttribute("href");
        if (/galeatiyayinevi\.com\/?$/i.test(href || "")) {
          row.status = STATUS.MISMATCH;
          row.note = "galeati-homepage";
        }
      }

      const failed = Object.values(row.checks).some((v) => v === false);
      if (failed && row.status === STATUS.PASS) {
        row.status = STATUS.MISMATCH;
        row.note = "book-consistency-failed";
      }
      results.books.push(row);
    }
    await ctx2.close();

    // --- videos ---
    const vj = readJson("assets/videos.json");
    const vids = vj.videos || [];
    const ids = new Set();
    for (const v of vids) {
      const row = { id: v.id, title: v.title, url: v.url, status: STATUS.PASS, checks: {} };
      const idFromUrl = youtubeIdFromUrl(v.url);
      row.checks.idMatchesUrl = idFromUrl === v.id;
      row.checks.thumbId = (v.thumbnail || "").includes(v.id);
      if (ids.has(v.id)) {
        row.status = STATUS.MISMATCH;
        row.note = "duplicate-id";
      }
      ids.add(v.id);
      if (!row.checks.idMatchesUrl || !row.checks.thumbId) {
        row.status = STATUS.MISMATCH;
        row.note = row.note || "id-thumb-mismatch";
      }
      results.videos.push(row);
    }
    // chronological non-increasing by publishedAt
    const times = vids.map((v) => Date.parse(v.publishedAt || 0));
    let sorted = true;
    for (let i = 1; i < times.length; i++) {
      if (times[i] > times[i - 1]) {
        sorted = false;
        break;
      }
    }
    results.videosMeta = { count: vids.length, newestFirst: sorted };

    // --- english ---
    const eng = readJson("assets/eng-yazilar.json");
    for (const e of eng) {
      const row = { title: e.title, link: e.link, status: e.status || "ok", checks: {} };
      row.checks.linkExists = fs.existsSync(path.join(ROOT, e.link));
      if (e.link.includes("media-landscape.pdf") || e.linkType === "pdf") {
        row.status = STATUS.BROKEN;
        row.note = "pdf-missing";
      } else if (e.status === "unavailable") {
        row.status = STATUS.PASS;
        row.note = "honest-unavailable-page";
      } else if (e.status === "placeholder") {
        row.status = STATUS.PASS;
        row.note = "placeholder-acknowledged";
      }
      if (!row.checks.linkExists) {
        row.status = STATUS.BROKEN;
        row.note = "missing-target";
      }
      // mismatch: democracy page must not be used for media landscape
      if (/media|landscape/i.test(e.title) && e.link === "eng_article.html") {
        row.status = STATUS.MISMATCH;
        row.note = "wrong-english-target";
      }
      results.english.push(row);
    }
  } finally {
    await browser.close();
  }

  return results;
}

export default auditContentMatching;
