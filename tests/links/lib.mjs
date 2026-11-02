import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");
export const BASE = process.env.AUDIT_BASE || process.argv[2] || "http://127.0.0.1:8765";

export const STATUS = {
  PASS: "PASS",
  FIXED: "FIXED",
  BROKEN: "BROKEN",
  MISMATCH: "MISMATCH",
  UNVERIFIED: "UNVERIFIED",
};

export function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

export function listRootHtml() {
  return fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith(".html"))
    .sort();
}

export function isExternal(href) {
  return /^https?:\/\//i.test(href || "");
}

export function isSkippable(href) {
  if (!href) return true;
  const h = href.trim();
  if (h.startsWith("mailto:") || h.startsWith("tel:") || h.startsWith("javascript:")) return true;
  if (h.startsWith("data:")) return true;
  return false;
}

export function stripHashQuery(href) {
  return (href || "").split("#")[0].split("?")[0];
}

/** Block private / SSRF-ish targets for external fetcher. */
export function assertSafeExternalUrl(urlStr) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    throw new Error("invalid-url");
  }
  if (!/^https?:$/i.test(u.protocol)) throw new Error("bad-protocol");
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === "169.254.169.254" ||
    host === "metadata.google.internal"
  ) {
    throw new Error("private-host");
  }
  return u;
}

export async function fetchExternal(urlStr, { timeoutMs = 12000 } = {}) {
  assertSafeExternalUrl(urlStr);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res = await fetch(urlStr, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "IbrahimGunduzLinkAudit/2.7 (+local QA; respectful)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const text = await res.text().catch(() => "");
    return {
      status: res.status,
      finalUrl: res.url,
      body: text.slice(0, 120000),
      okHttp: res.status >= 200 && res.status < 400,
    };
  } catch (e) {
    const msg = String(e && e.name === "AbortError" ? "timeout" : e);
    return { status: 0, finalUrl: urlStr, body: "", okHttp: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

export function classifyHttp(res) {
  if (res.error && /timeout|abort/i.test(res.error)) return STATUS.UNVERIFIED;
  if (res.status === 403 || res.status === 429 || res.status === 401) return STATUS.UNVERIFIED;
  if (res.status === 0) return STATUS.UNVERIFIED;
  if (res.status === 404 || res.status === 410) return STATUS.BROKEN;
  if (res.status >= 500) return STATUS.UNVERIFIED;
  if (res.status >= 200 && res.status < 400) return STATUS.PASS;
  return STATUS.UNVERIFIED;
}

export function bodyHasAny(body, needles) {
  const b = (body || "").toLowerCase();
  const bn = b.replace(/[-_]+/g, " ");
  return needles.some((n) => {
    const needle = String(n).toLowerCase();
    const nn = needle.replace(/[-_]+/g, " ");
    return b.includes(needle) || bn.includes(nn);
  });
}

export function youtubeIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2];
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}
