/**
 * External URL health + light content matching for sellers/social/videos.
 * Respectful: limited concurrency, SSRF guard, 403/CAPTCHA → UNVERIFIED.
 */
import {
  STATUS,
  fetchExternal,
  classifyHttp,
  bodyHasAny,
  youtubeIdFromUrl,
  assertSafeExternalUrl,
} from "./lib.mjs";

const BOOK_EXPECT = {
  "altin-olum": {
    titleHints: ["altın ölüm", "altin olum", "6056996875"],
    authorHints: ["gündüz", "gunduz", "ibrahim"],
  },
  "altin-girdap": {
    titleHints: ["altın girdap", "altin girdap", "6057426975"],
    authorHints: ["gündüz", "gunduz", "ibrahim"],
  },
  "o-soruyu": {
    titleHints: ["soruyu", "ekranın arkası", "ekranin arkasi", "6057180844"],
    authorHints: ["gündüz", "gunduz", "ibrahim"],
  },
  copler: {
    titleHints: ["çöpler", "copler", "6256876482", "sömürge", "somurge"],
    authorHints: ["gündüz", "gunduz", "ibrahim"],
  },
};

function bookKeyFromSource(source, href) {
  const s = `${source} ${href}`.toLowerCase();
  if (s.includes("altin-olum") || s.includes("altın-ölüm") || s.includes("6056996875")) return "altin-olum";
  if (s.includes("altin-girdap") || s.includes("6057426975")) return "altin-girdap";
  if (s.includes("soruyu") || s.includes("6057180844")) return "o-soruyu";
  if (s.includes("copler") || s.includes("çöpler") || s.includes("6256876482")) return "copler";
  return null;
}

function isSellerHost(host) {
  return /(amazon\.|kitapyurdu|galeati|akakce|nadirkitap|dr\.com\.tr|kitapstore|seyirkitap)/i.test(host);
}

function isSocialHost(host) {
  return /(x\.com|twitter\.com|instagram\.com|facebook\.com|linkedin\.com|youtube\.com|youtu\.be)/i.test(host);
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

export async function auditExternal(occurrences) {
  const externals = [];
  const seen = new Map();
  for (const o of occurrences) {
    const href = (o.href || "").trim();
    if (!/^https?:\/\//i.test(href)) continue;
    try {
      assertSafeExternalUrl(href);
    } catch {
      externals.push({
        href,
        source: o.source,
        status: STATUS.BROKEN,
        note: "blocked-unsafe-or-invalid",
      });
      continue;
    }
    if (!seen.has(href)) seen.set(href, []);
    seen.get(href).push(o.source);
  }

  const unique = [...seen.entries()].map(([href, sources]) => ({ href, sources }));

  const results = await mapPool(unique, 4, async ({ href, sources }) => {
    let host = "";
    try {
      host = new URL(href).hostname;
    } catch {
      return { href, sources, status: STATUS.BROKEN, note: "bad-url" };
    }

    // YouTube: prefer oEmbed + id/thumbnail consistency
    if (/youtube\.com|youtu\.be/i.test(host)) {
      // Channel / handle URLs are not watch IDs
      if (/\/@|\/channel\/|\/c\//i.test(href) || /youtube\.com\/@/i.test(href)) {
        const res = await fetchExternal(href);
        return {
          href,
          sources,
          status: classifyHttp(res),
          note: "youtube-channel",
          httpStatus: res.status,
        };
      }
      const id = youtubeIdFromUrl(href);
      if (!id) {
        return { href, sources, status: STATUS.UNVERIFIED, note: "youtube-no-video-id" };
      }
      const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
      const [tRes, oRes] = await Promise.all([fetchExternal(thumb), fetchExternal(oembed)]);
      if (oRes.status === 404 || oRes.status === 400) {
        return { href, sources, status: STATUS.BROKEN, note: "youtube-oembed-missing", id };
      }
      if (oRes.status === 403 || oRes.status === 429 || oRes.status === 0) {
        // thumbnail often still works
        if (tRes.okHttp) {
          return { href, sources, status: STATUS.UNVERIFIED, note: "youtube-oembed-blocked-thumb-ok", id };
        }
        return { href, sources, status: STATUS.UNVERIFIED, note: "youtube-blocked", id };
      }
      if (oRes.okHttp) {
        let title = "";
        try {
          title = JSON.parse(oRes.body).title || "";
        } catch {
          /* ignore */
        }
        return {
          href,
          sources,
          status: STATUS.PASS,
          note: "youtube-oembed",
          id,
          title,
        };
      }
      return { href, sources, status: classifyHttp(oRes), id, httpStatus: oRes.status };
    }

    const res = await fetchExternal(href);
    let status = classifyHttp(res);
    let note = res.error || `http-${res.status}`;
    let mismatch = false;

    // Live production URLs may 404 until Pages deploy — do not treat as local breakage
    if (/ibrahimgunduz\.com\.tr/i.test(host) && (res.status === 404 || res.status === 0)) {
      status = STATUS.UNVERIFIED;
      note = "production-not-deployed-or-unreachable";
    }

    const bookKey = bookKeyFromSource(sources.join(","), href);
    if (status === STATUS.PASS && bookKey && isSellerHost(host)) {
      const exp = BOOK_EXPECT[bookKey];
      const titleOk = bodyHasAny(res.body, exp.titleHints);
      const authorOk = bodyHasAny(res.body, exp.authorHints);
      const isbnOk = bodyHasAny(res.body, exp.titleHints.filter((h) => /^\d{10,13}$/.test(h) || h.length > 8 && /^\d/.test(h)));
      // URL path often contains slug/isbn even when body is JS-rendered
      const urlHint = bodyHasAny(href + " " + (res.finalUrl || ""), exp.titleHints);
      if (titleOk || isbnOk || urlHint) {
        note = titleOk ? "seller-title-matched" : "seller-url-or-isbn-hint";
      } else if (/galeatiyayinevi\.com\/?$/i.test(res.finalUrl) || /galeatiyayinevi\.com\/?$/i.test(href)) {
        status = STATUS.MISMATCH;
        note = "publisher-homepage-not-product";
        mismatch = true;
      } else if (res.body.length < 2000 || !authorOk) {
        status = STATUS.UNVERIFIED;
        note = "seller-spa-or-thin-body";
      } else {
        status = STATUS.MISMATCH;
        note = "title-author-not-found-in-body";
        mismatch = true;
      }
    }

    if (status === STATUS.PASS && isSocialHost(host)) {
      if (/^https?:\/\/(www\.)?facebook\.com\/?$/i.test(href)) {
        status = STATUS.MISMATCH;
        note = "facebook-homepage-placeholder";
        mismatch = true;
      } else {
        note = "social-http-ok";
      }
    }

    return {
      href,
      sources,
      status,
      note,
      mismatch,
      httpStatus: res.status,
      finalUrl: res.finalUrl,
      bookKey,
    };
  });

  return results;
}

export default auditExternal;
