/**
 * Admin panel visibility — logged-out and logged-in shells.
 * Usage: node tests/admin/visibility.mjs [baseUrl]
 */
import { chromium, webkit } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "out");
const BASE = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const TABS = ["Genel Bakış", "Yazılar", "Yeni Yazı Ekle", "Taslaklar", "İnceleme Bekleyenler", "Ayarlar"];

fs.mkdirSync(OUT, { recursive: true });

function health(oauth) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      service: "ig-admin-api",
      ok: true,
      oauthConfigured: oauth,
      githubWriteConfigured: true,
    }),
  };
}

async function measure(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { missing: true };
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      display: cs.display,
      visibility: cs.visibility,
      position: cs.position,
      width: box.width,
      height: box.height,
      text: (el.innerText || "").slice(0, 180),
    };
  }, selector);
}

function assertVisible(info, label) {
  if (info.missing) throw new Error(label + " missing");
  if (info.display === "none" || info.visibility === "hidden") {
    throw new Error(label + " hidden: " + JSON.stringify(info));
  }
  if (info.width < 40 || info.height < 40) {
    throw new Error(label + " box too small: " + JSON.stringify(info));
  }
}

async function runLoggedOut(page, tag) {
  await page.route("**/api/health", (route) => route.fulfill(health(true)));
  await page.route("**/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: '{"authenticated":false,"error":"Yetkisiz"}' })
  );
  await page.goto(BASE + "/admin/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "GitHub ile giriş" }).waitFor({ state: "visible" });
  const gate = await measure(page, "#gate");
  const login = await measure(page, "#login-btn");
  const app = await measure(page, "#app");
  assertVisible(gate, "gate");
  assertVisible(login, "login");
  if (!gate.text.includes("Yazı Yönetimi")) throw new Error("title missing: " + gate.text);
  if (app.display !== "none") throw new Error("app should be hidden when logged out: " + JSON.stringify(app));
  const legacy = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "admin-panel";
    document.body.appendChild(el);
    return getComputedStyle(el).display;
  });
  if (legacy !== "none") throw new Error("legacy .admin-panel display should stay none, got " + legacy);
  await page.screenshot({ path: path.join(OUT, tag + "-logged-out.png"), fullPage: true });
  return { gate, login, legacy };
}

async function runLoggedIn(page, tag) {
  await page.route("**/api/health", (route) => route.fulfill(health(true)));
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, user: "ibrahimgunduz-gazeteci", csrf: "test-csrf" }),
    })
  );
  await page.route("**/api/articles", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"articles":[]}' })
  );
  await page.route("**/api/discovery-queue", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"queue":[]}' })
  );
  await page.route("**/assets/data/discovery-queue.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"queue":[]}' })
  );
  await page.goto(BASE + "/admin/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Genel Bakış" }).waitFor({ state: "visible" });
  const card = await measure(page, "#admin-card");
  const app = await measure(page, "#app");
  assertVisible(card, "admin-card");
  assertVisible(app, "app");
  const gateHidden = await page.evaluate(() => getComputedStyle(document.getElementById("gate")).display);
  if (gateHidden !== "none") throw new Error("gate should hide after login");
  for (const name of TABS) {
    const tab = page.getByRole("button", { name, exact: true });
    await tab.click();
    const pane = await page.evaluate((label) => {
      const btn = [...document.querySelectorAll(".admin-nav .tab")].find((b) => b.textContent.trim() === label);
      const view = btn && btn.getAttribute("data-view");
      const pane = document.querySelector('[data-pane="' + view + '"]');
      const cs = pane ? getComputedStyle(pane) : null;
      const box = pane ? pane.getBoundingClientRect() : null;
      return { view, display: cs && cs.display, height: box && box.height, heading: pane && pane.querySelector("h2") && pane.querySelector("h2").textContent };
    }, name);
    if (!pane || pane.display === "none" || pane.height < 20) {
      throw new Error("pane not visible: " + name + " " + JSON.stringify(pane));
    }
  }
  await page.screenshot({ path: path.join(OUT, tag + "-logged-in.png"), fullPage: true });
  return { card, tabs: TABS.length };
}

async function withBrowser(engine, name, viewport) {
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await context.newPage();
  const out = { name, loggedOut: await runLoggedOut(page, name + "-light") };
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.screenshot({ path: path.join(OUT, name + "-dark-logged-out.png") });
  const darkBg = await page.evaluate(() => getComputedStyle(document.getElementById("gate")).backgroundColor);
  out.darkBackground = darkBg;
  await context.close();
  const context2 = await browser.newContext({ viewport, colorScheme: "light" });
  const page2 = await context2.newPage();
  out.loggedIn = await runLoggedIn(page2, name + "-light");
  await browser.close();
  return out;
}

const results = [];
results.push(await withBrowser(chromium, "chromium-desktop", { width: 1280, height: 800 }));
results.push(await withBrowser(chromium, "chromium-mobile", { width: 390, height: 844 }));
try {
  results.push(await withBrowser(webkit, "webkit", { width: 1280, height: 800 }));
} catch (err) {
  results.push({ name: "webkit", error: String(err.message || err) });
}

const failed = results.filter((r) => r.error);
fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (failed.length) process.exit(1);
