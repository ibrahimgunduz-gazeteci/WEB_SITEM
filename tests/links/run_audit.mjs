/**
 * v2.7 full link & content audit orchestrator.
 * Usage: node tests/links/run_audit.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { ROOT, BASE, STATUS, ensureDir } from "./lib.mjs";
import { auditInternal, collectFromFile, collectJsonUrls } from "./internal_links.mjs";
import { auditExternal } from "./external_links.mjs";
import { auditContentMatching } from "./content_matching.mjs";
import { auditNavigationClicks } from "./navigation_clicks.mjs";
import { listRootHtml } from "./lib.mjs";

function tally(items) {
  const c = { PASS: 0, FIXED: 0, BROKEN: 0, MISMATCH: 0, UNVERIFIED: 0, OTHER: 0 };
  for (const it of items) {
    const s = it.status || "OTHER";
    if (c[s] === undefined) c.OTHER++;
    else c[s]++;
  }
  return c;
}

function flattenStatuses(report) {
  const all = [];
  for (const r of report.internal?.results || []) all.push(r);
  for (const r of report.external || []) all.push(r);
  for (const r of report.content?.articles || []) all.push(r);
  for (const r of report.content?.books || []) all.push(r);
  for (const r of report.content?.videos || []) all.push(r);
  for (const r of report.content?.english || []) all.push(r);
  for (const r of report.navigation?.nav || []) all.push(r);
  for (const r of report.navigation?.back || []) all.push(r);
  for (const r of report.navigation?.responsive || []) all.push(r);
  for (const r of report.fixed || []) all.push({ ...r, status: STATUS.FIXED });
  return all;
}

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|");
}

async function main() {
  const started = new Date().toISOString();
  console.log("BASE", BASE);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const fetchFn = (url) => page.request.get(url);

  // Build occurrence inventory
  const occurrences = [];
  for (const f of listRootHtml()) occurrences.push(...collectFromFile(f));
  for (const f of ["assets/js/articles.js", "assets/js/youtube-feed.js", "assets/js/main.js"]) {
    occurrences.push(...collectFromFile(f));
  }
  occurrences.push(...collectJsonUrls());

  console.log("occurrences", occurrences.length);

  const internal = await auditInternal(fetchFn);
  await context.close();
  await browser.close();

  console.log("internal done", internal.results.length);

  const external = await auditExternal([...occurrences, ...internal.occurrences]);
  console.log("external done", external.length);

  const content = await auditContentMatching();
  console.log("content done articles", content.articles.length);

  const navigation = await auditNavigationClicks();
  console.log("navigation done");

  const fixed = [
    {
      id: "facebook-placeholder-satin-al",
      description: "4 satın alma sayfasındaki facebook.com ana sayfa placeholder’ı gerçek profil URL’siyle değiştirildi",
      status: STATUS.FIXED,
    },
    {
      id: "galeati-copler-product",
      description: "Çöpler Faciası Galeati bağlantısı yayınevi anasayfasından ürün sayfasına alındı",
      status: STATUS.FIXED,
    },
    {
      id: "altin-olum-index-year",
      description: "index.html Altın Ölüm yılı 2023 → 2020 (bibliyografik tutarlılık)",
      status: STATUS.FIXED,
    },
    {
      id: "eng-pdf-honest-status",
      description: "Eksik media-landscape.pdf için yanlış eng_article eşleşmesi kaldırıldı; eng_media_landscape.html durum sayfası",
      status: STATUS.FIXED,
    },
    {
      id: "noopener-rel",
      description: "target=_blank bağlantılara rel=noopener noreferrer eklendi",
      status: STATUS.FIXED,
    },
  ];

  // SEO quick checks
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
  const seo = {
    robotsHasSitemap: /Sitemap:\s*https:\/\/ibrahimgunduz\.com\.tr\/sitemap\.xml/i.test(robots),
    sitemapUrls: [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
    missingLocal: [],
  };
  for (const loc of seo.sitemapUrls) {
    const u = new URL(loc);
    let file = u.pathname.replace(/^\//, "");
    if (!file || file.endsWith("/")) file = "index.html";
    if (!fs.existsSync(path.join(ROOT, file))) seo.missingLocal.push(file);
  }
  // eng_media_landscape should be listed ideally
  seo.engMediaInSitemap = seo.sitemapUrls.some((u) => u.includes("eng_media_landscape"));

  const report = {
    version: "2.7",
    base: BASE,
    startedAt: started,
    finishedAt: new Date().toISOString(),
    inventory: {
      occurrenceCount: occurrences.length + internal.occurrences.length,
      // unique hrefs
      uniqueHrefs: [...new Set([...occurrences, ...internal.occurrences].map((o) => o.href).filter(Boolean))].length,
      htmlPages: listRootHtml().length,
    },
    fixed,
    internal,
    external,
    content,
    navigation,
    seo,
  };

  // Deduplicate inventory counts more carefully
  const allOcc = [...occurrences];
  report.inventory.occurrenceCount = allOcc.length;
  report.inventory.uniqueHrefs = new Set(allOcc.map((o) => o.href)).size;

  const all = flattenStatuses(report);
  report.summary = {
    totalChecked: all.length,
    ...tally(all),
    articles: {
      total: content.articles.length,
      pass: content.articles.filter((a) => a.status === STATUS.PASS).length,
      broken: content.articles.filter((a) => a.status === STATUS.BROKEN).length,
      mismatch: content.articles.filter((a) => a.status === STATUS.MISMATCH).length,
    },
    books: content.books,
    videosPass: content.videos.filter((v) => v.status === STATUS.PASS).length,
    videosTotal: content.videos.length,
    english: content.english,
  };

  const internalBroken = (report.internal?.results || []).filter(
    (x) => x.status === STATUS.BROKEN && (x.kind === "internal-http" || x.kind === "internal-asset" || x.kind === "section-id" || x.kind === "legacy-filename")
  );
  const articleBad = content.articles.filter((a) => a.status === STATUS.BROKEN || a.status === STATUS.MISMATCH);
  const bookBad = content.books.filter((b) => b.status === STATUS.BROKEN || b.status === STATUS.MISMATCH);
  const navBad = [...(navigation.nav || []), ...(navigation.back || [])].filter((n) => n.status === STATUS.BROKEN);
  const sellerMismatch = (external || []).filter((e) => e.status === STATUS.MISMATCH && e.bookKey);
  // External news-source URLs inside legacy htmlContent may 404/410 on third parties;
  // they do not break local haber.html rendering. Track separately.
  const externalSourceBroken = (external || []).filter(
    (e) => e.status === STATUS.BROKEN && (e.sources || []).every((s) => String(s).includes("yazilar.json"))
  );

  const blocking = [];
  if (internalBroken.length) blocking.push(`internal-broken:${internalBroken.length}`);
  if (articleBad.length) blocking.push(`articles:${articleBad.length}`);
  if (bookBad.length) blocking.push(`books:${bookBad.length}`);
  if (navBad.length) blocking.push(`nav:${navBad.length}`);
  if (sellerMismatch.length) blocking.push(`seller-mismatch:${sellerMismatch.length}`);
  report.externalSourceBroken = externalSourceBroken;

  report.blocking = blocking;
  report.releaseHint = blocking.length
    ? "BLOCKED"
    : "READY WITH EXTERNAL CONFIGURATION PENDING";

  // Write JSON at repo root as requested
  const jsonPath = path.join(ROOT, "LINK-AUDIT.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // Markdown
  const md = [];
  md.push("# LINK-AUDIT — v2.7");
  md.push("");
  md.push(`**Tarih:** ${report.finishedAt}`);
  md.push(`**Base:** ${BASE}`);
  md.push("");
  md.push("## Özet");
  md.push("");
  md.push(`| Metrik | Değer |`);
  md.push(`|---|---:|`);
  md.push(`| Envanter (occurrence) | ${report.inventory.occurrenceCount} |`);
  md.push(`| Benzersiz href | ${report.inventory.uniqueHrefs} |`);
  md.push(`| Kontrol edilen kayıt | ${report.summary.totalChecked} |`);
  md.push(`| PASS | ${report.summary.PASS} |`);
  md.push(`| FIXED | ${report.summary.FIXED} |`);
  md.push(`| BROKEN | ${report.summary.BROKEN} |`);
  md.push(`| MISMATCH | ${report.summary.MISMATCH} |`);
  md.push(`| UNVERIFIED | ${report.summary.UNVERIFIED} |`);
  md.push("");
  md.push("## Bu turda düzeltilenler (FIXED)");
  for (const f of fixed) md.push(`- **${f.id}:** ${f.description}`);
  md.push("");
  md.push("## 72 makale");
  md.push("");
  md.push(`Toplam: ${report.summary.articles.total} · PASS: ${report.summary.articles.pass} · BROKEN: ${report.summary.articles.broken} · MISMATCH: ${report.summary.articles.mismatch}`);
  const badArts = content.articles.filter((a) => a.status !== STATUS.PASS);
  if (badArts.length) {
    md.push("");
    md.push("| Durum | Başlık | Not |");
    md.push("|---|---|---|");
    for (const a of badArts.slice(0, 50)) {
      md.push(`| ${a.status} | ${mdEscape(a.title).slice(0, 60)} | ${mdEscape(a.note)} |`);
    }
  } else {
    md.push("");
    md.push("Tüm 72 makale `haber.html?file=...` üzerinden başlık/içerik eşleşmesiyle doğrulandı.");
  }
  md.push("");
  md.push("## Kitaplar");
  md.push("");
  md.push("| Kitap | Durum | Not |");
  md.push("|---|---|---|");
  for (const b of content.books) {
    md.push(`| ${b.title} | ${b.status} | ${mdEscape(b.note || "OK")} |`);
  }
  md.push("");
  md.push("## Videolar");
  md.push(`Toplam ${content.videos.length}, PASS ${report.summary.videosPass}, newestFirst=${content.videosMeta?.newestFirst}`);
  md.push("");
  md.push("## İngilizce / PDF");
  for (const e of content.english) {
    md.push(`- **${e.title}** → \`${e.link}\` · ${e.status} · ${e.note || ""}`);
  }
  md.push("");
  md.push("## Haricî (özet)");
  const extT = tally(external);
  md.push(`PASS ${extT.PASS} · UNVERIFIED ${extT.UNVERIFIED} · BROKEN ${extT.BROKEN} · MISMATCH ${extT.MISMATCH}`);
  const extBad = external.filter((e) => e.status === STATUS.BROKEN || e.status === STATUS.MISMATCH);
  if (extBad.length) {
    md.push("");
    md.push("| Durum | URL | Not |");
    md.push("|---|---|---|");
    for (const e of extBad.slice(0, 40)) {
      md.push(`| ${e.status} | ${mdEscape(e.href).slice(0, 80)} | ${mdEscape(e.note)} |`);
    }
  }
  md.push("");
  md.push("## Navigasyon / responsive");
  md.push(`Nav clicks: ${tally(navigation.nav).PASS}/${navigation.nav.length} PASS`);
  md.push(`Back links: ${tally(navigation.back).PASS}/${navigation.back.length} PASS`);
  md.push(`Responsive: ${tally(navigation.responsive).PASS}/${navigation.responsive.length} PASS`);
  md.push(`Engines: ${JSON.stringify(navigation.engines)}`);
  md.push("");
  md.push("## SEO");
  md.push(`robots sitemap ref: ${seo.robotsHasSitemap}`);
  md.push(`sitemap missing local files: ${seo.missingLocal.join(", ") || "yok"}`);
  md.push(`eng_media_landscape in sitemap: ${seo.engMediaInSitemap}`);
  md.push("");
  md.push("## Durum sınıfları");
  md.push("- PASS — doğrulandı");
  md.push("- FIXED — bu turda düzeltildi");
  md.push("- BROKEN — bozuk");
  md.push("- MISMATCH — açılıyor ama yanlış içerik");
  md.push("- UNVERIFIED — bot koruması / timeout / yetersiz kanıt");
  md.push("");
  md.push(`Ham JSON: \`LINK-AUDIT.json\``);

  fs.writeFileSync(path.join(ROOT, "LINK-AUDIT.md"), md.join("\n"));
  console.log(JSON.stringify({ summary: report.summary, releaseHint: report.releaseHint }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
