/**
 * Shared article helpers for the Worker (also mirrored in Python tests).
 */

export const PRIORITY_HOSTS = new Set([
  "12punto.com",
  "www.12punto.com",
  "odatv.com",
  "www.odatv.com",
  "odatv4.com",
  "www.odatv4.com",
  "kisadalga.net",
  "www.kisadalga.net",
]);

export const CATEGORIES = new Set(["genel", "cevre", "madencilik", "medya", "siyaset", "diger"]);
export const STATUSES = new Set(["draft", "published", "unpublished"]);

export function isPrivateHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === "169.254.169.254" || h.startsWith("169.254.")) return true;
  if (h.endsWith(".nip.io") || h.endsWith(".sslip.io")) return true;
  return false;
}

export function normalizeUrl(url) {
  const u = new URL(String(url || "").trim());
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Yalnızca http/https");
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  const host = u.hostname.replace(/^www\./, "");
  u.pathname = (u.pathname.replace(/\/+$/, "") || "/");
  // Prefer https for storage key
  const key = `https://${host}${u.pathname}${u.search || ""}`;
  return { url: u.toString(), key, host, priority: PRIORITY_HOSTS.has(u.hostname) || PRIORITY_HOSTS.has(host) };
}

export function stripHtml(str) {
  return String(str || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function sanitizeText(str, max = 2000) {
  const clean = stripHtml(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return clean.slice(0, max);
}

export function sanitizeArticle(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Geçersiz kayıt");
  const { url, key, priority } = normalizeUrl(raw.url);
  const title = sanitizeText(raw.title, 300);
  if (!title) throw new Error("Başlık zorunlu");
  const status = STATUSES.has(raw.status) ? raw.status : "draft";
  const category = CATEGORIES.has(raw.category) ? raw.category : "genel";
  let image = raw.image ? sanitizeText(raw.image, 800) : null;
  if (image && !/^https:\/\//i.test(image) && !image.startsWith("/") && !image.startsWith("static/") && !image.startsWith("assets/")) {
    image = null;
  }
  return {
    id: sanitizeText(raw.id || "", 40) || key.slice(-12),
    url,
    urlKey: key,
    title,
    author: sanitizeText(raw.author || "İbrahim Gündüz", 120) || "İbrahim Gündüz",
    publisher: sanitizeText(raw.publisher || "", 120) || null,
    publishedAt: raw.publishedAt ? sanitizeText(raw.publishedAt, 40) : null,
    image,
    excerpt: sanitizeText(raw.excerpt || "", 600) || null,
    category,
    status,
    prioritySource: priority,
    legacyFileName: raw.legacyFileName || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeArticles(existing, incoming) {
  const byKey = new Map();
  for (const a of existing || []) {
    try {
      const n = normalizeUrl(a.url);
      byKey.set(n.key, a);
    } catch {
      /* skip bad */
    }
  }
  const out = [];
  const seen = new Set();
  for (const raw of incoming || []) {
    const art = sanitizeArticle(raw);
    if (seen.has(art.urlKey)) throw new Error("Yinelenen URL: " + art.url);
    seen.add(art.urlKey);
    const prev = byKey.get(art.urlKey);
    if (prev && prev.id && !raw.id) art.id = prev.id;
    if (prev && prev.createdAt) art.createdAt = prev.createdAt;
    out.push(art);
  }
  // Keep articles not in incoming? Full replace payload from admin.
  return out;
}

export function assertSafeFetchUrl(url) {
  const { url: full, host, priority } = normalizeUrl(url);
  if (!/^https:\/\//i.test(full)) throw new Error("Yalnızca https URL");
  const u = new URL(full);
  if (isPrivateHost(u.hostname)) throw new Error("Özel ağ adresleri engellendi");
  if (u.username || u.password) throw new Error("Kimlik bilgili URL engellendi");
  return { url: full, host, priority };
}
