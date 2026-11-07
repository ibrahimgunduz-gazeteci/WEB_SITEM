/**
 * Playwright: article card badge/CTA/arrow + link targets (live or file URL).
 * Usage: node tests/articles/card_ui.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "https://ibrahimgunduz.com.tr";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function checkPage(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".article-card .read-more", { timeout: 30000 });

  const badges = await page.locator(".article-source-badge").count();
  assert(badges === 0, `${path}: unexpected Kaynak site badge count ${badges}`);

  const cards = page.locator(".article-card");
  const n = await cards.count();
  assert(n > 0, `${path}: no article cards`);

  for (let i = 0; i < Math.min(n, 12); i++) {
    const card = cards.nth(i);
    const link = card.locator("a.read-more");
    const text = (await link.innerText()).replace(/\s+/g, " ").trim();
    // CSS ::after arrow is not in innerText in Chromium; visible text should be CTA only.
    assert(text === "Devamını Oku", `${path} card ${i}: got "${text}"`);
    assert(!text.includes("→"), `${path} card ${i}: arrow leaked into text node`);

    const after = await link.evaluate((el) => {
      const c = getComputedStyle(el, "::after").content;
      return c && c !== "none" ? c.replace(/^"|"$/g, "") : "";
    });
    assert(after === "→", `${path} card ${i}: ::after should be →, got ${after}`);

    const href = await link.getAttribute("href");
    const id = await card.getAttribute("data-article-id");
    if (id === "8e9da426") {
      assert(
        href && href.includes("odatv.com"),
        `${path}: Odatv card must link to odatv, got ${href}`
      );
      const target = await link.getAttribute("target");
      assert(target === "_blank", `${path}: external Odatv must open in new tab`);
      const meta = await card.locator(".article-meta-line").innerText();
      assert(/Odatv/i.test(meta), `${path}: Odatv must remain in metadata`);
    } else if (href && !/^https?:/i.test(href)) {
      assert(!href.startsWith("http"), `${path}: legacy should be local path`);
    }
  }

  // Double-arrow visual: textContent of link element children only (no ::after)
  const doubles = await page.evaluate(() => {
    return [...document.querySelectorAll(".article-card a.read-more")].filter((a) =>
      /→/.test(a.textContent || "")
    ).length;
  });
  assert(doubles === 0, `${path}: ${doubles} links still have → in DOM text`);

  return n;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const homeCount = await checkPage(page, "/");
  // Home uses slider; ensure featured section exists
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("#featured-articles .article-card .read-more", { timeout: 30000 });

  const allCount = await checkPage(page, "/tum-yazilar.html");

  // Dark theme smoke on tum-yazilar
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  const darkText = await page.locator(".article-card a.read-more").first().innerText();
  assert(darkText.trim() === "Devamını Oku", "dark theme CTA text broken");

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".article-card .read-more");
  const mobileBadge = await page.locator(".article-source-badge").count();
  assert(mobileBadge === 0, "mobile still shows Kaynak site badge");
  const mobileText = await page.locator(".article-card a.read-more").first().innerText();
  assert(mobileText.trim() === "Devamını Oku", "mobile CTA text broken");

  await browser.close();
  console.log(
    JSON.stringify({
      ok: true,
      base: BASE,
      homeCardsSampled: homeCount,
      allCards: allCount,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
