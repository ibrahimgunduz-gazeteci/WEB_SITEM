/**
 * İbrahim Gündüz — Admin API Worker (v2.5)
 * Secrets (wrangler secret put):
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_TOKEN,
 *   ALLOWED_GITHUB_USERS, SESSION_SECRET,
 *   REPO_OWNER, REPO_NAME, REPO_BRANCH
 * Optional: ALLOWED_ORIGINS, ADMIN_SUCCESS_URL
 */

import {
  assertSafeFetchUrl,
  mergeArticles,
  normalizeUrl,
  sanitizeArticle,
  sanitizeText,
  PRIORITY_HOSTS,
} from "./article_utils.js";

const rateBuckets = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function withCors(req, res, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "https://ibrahimgunduz.com.tr,http://127.0.0.1:8765,http://localhost:8765")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const headers = new Headers(res.headers);
  if (allowed.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("access-control-allow-headers", "content-type, x-csrf-token");
    headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
    headers.set("vary", "Origin");
  }
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  return new Response(res.body, { status: res.status, headers });
}

function b64url(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

function rateLimit(key, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || now - b.start > windowMs) {
    b = { start: now, count: 0 };
    rateBuckets.set(key, b);
  }
  b.count += 1;
  return b.count <= limit;
}

async function makeSession(env, user, githubId) {
  const csrf = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = btoa(
    JSON.stringify({
      u: user,
      id: githubId || null,
      exp: Date.now() + 1000 * 60 * 60 * 12,
      csrf,
    })
  );
  const token = `${payload}.${await sign(env.SESSION_SECRET, payload)}`;
  return { token, csrf };
}

function oauthStateCookie(value, clear = false) {
  if (clear) return "ig_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
  return `ig_oauth_state=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

function readCookie(req, name) {
  const raw = req.headers.get("Cookie") || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function safeAdminRedirect(env) {
  const fallback = "https://ibrahimgunduz.com.tr/admin/";
  const raw = env.ADMIN_SUCCESS_URL || fallback;
  try {
    const u = new URL(raw);
    const allowedHosts = new Set(["ibrahimgunduz.com.tr", "www.ibrahimgunduz.com.tr", "127.0.0.1", "localhost"]);
    if (!allowedHosts.has(u.hostname.toLowerCase())) return fallback;
    if (u.protocol !== "https:" && !(u.hostname === "127.0.0.1" || u.hostname === "localhost")) return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

async function readSession(env, req) {
  if (!env.SESSION_SECRET) return null;
  const raw = req.headers.get("Cookie") || "";
  const m = raw.match(/(?:^|;\s*)ig_session=([^;]+)/);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if ((await sign(env.SESSION_SECRET, payload)) !== sig) return null;
  try {
    const data = JSON.parse(atob(payload));
    if (!data.exp || data.exp < Date.now()) return null;
    const allowed = (env.ALLOWED_GITHUB_USERS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(String(data.u || "").toLowerCase())) return null;
    return data;
  } catch {
    return null;
  }
}

function requireCsrf(session, req) {
  const hdr = req.headers.get("x-csrf-token") || "";
  if (!session?.csrf || !hdr || hdr !== session.csrf) {
    throw new Error("CSRF doğrulaması başarısız");
  }
}

function sessionCookie(token, clear = false) {
  // SameSite=None: Pages (ibrahimgunduz.com.tr) Worker'a credential'lı istek atar.
  // Partitioned (CHIPS): Chrome üçüncü taraf çerez engelinde oturumun düşmesini azaltır.
  const attrs = "Path=/; HttpOnly; Secure; SameSite=None; Partitioned";
  if (clear) return `ig_session=; ${attrs}; Max-Age=0`;
  return `ig_session=${encodeURIComponent(token)}; ${attrs}; Max-Age=43200`;
}

async function fetchMeta(url) {
  let current = assertSafeFetchUrl(url).url;
  let resp = null;
  for (let hop = 0; hop < 4; hop++) {
    resp = await fetch(current, {
      headers: { "user-agent": "IbrahimGunduzWorker/2.5", accept: "text/html" },
      redirect: "manual",
    });
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc) throw new Error("Geçersiz yönlendirme");
      current = new URL(loc, current).toString();
      assertSafeFetchUrl(current);
      continue;
    }
    break;
  }
  if (!resp || !resp.ok) throw new Error("Kaynak HTTP " + (resp ? resp.status : "yok"));
  const finalUrl = current;
  assertSafeFetchUrl(finalUrl);
  const ctype = (resp.headers.get("content-type") || "").toLowerCase();
  if (ctype && !ctype.includes("text/html") && !ctype.includes("application/xhtml")) {
    throw new Error("Beklenen HTML değil (" + ctype + ")");
  }
  const html = (await resp.text()).slice(0, 750_000);

  const pick = (prop) => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      "i"
    );
    const m = html.match(re);
    return m ? sanitizeText(m[1] || m[2] || "", 800) : null;
  };

  let title = pick("og:title") || pick("twitter:title");
  if (!title) {
    const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = tm ? sanitizeText(tm[1], 300) : null;
  }

  const u = new URL(finalUrl);
  const host = u.hostname.toLowerCase();
  const priority = PRIORITY_HOSTS.has(host) || PRIORITY_HOSTS.has(host.replace(/^www\./, ""));

  return {
    url: finalUrl,
    title,
    excerpt: pick("og:description") || pick("description"),
    image: pick("og:image") || pick("twitter:image"),
    publisher: pick("og:site_name") || host.replace(/^www\./, ""),
    publishedAt: pick("article:published_time") || pick("date"),
    author: pick("author") || pick("article:author") || "İbrahim Gündüz",
    prioritySource: priority,
  };
}

async function githubGetFile(env, path) {
  const url = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${path}?ref=${encodeURIComponent(env.REPO_BRANCH || "main")}`;
  const resp = await fetch(url, {
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "ig-admin-worker",
    },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error("GitHub okuma hatası " + resp.status);
  return resp.json();
}

async function githubPutFile(env, path, contentText, sha, message) {
  const url = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${path}`;
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(contentText))),
    branch: env.REPO_BRANCH || "main",
  };
  if (sha) body.sha = sha;
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "ig-admin-worker",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error("GitHub yazma hatası " + resp.status + " " + (await resp.text()).slice(0, 400));
  return resp.json();
}

function decodeGithubContent(file) {
  return decodeURIComponent(escape(atob(file.content.replace(/\n/g, ""))));
}

async function loadArticlesDoc(env) {
  const file = await githubGetFile(env, "assets/external-articles.json");
  if (!file) return { file: null, data: { version: 1, updatedAt: new Date().toISOString(), articles: [] } };
  return { file, data: JSON.parse(decodeGithubContent(file)) };
}

async function triggerPagesDeploy(env) {
  // Belt-and-suspenders: PAT commits usually trigger deploy-pages on push,
  // but workflow_dispatch works even when the token would not re-trigger workflows.
  if (!env.GITHUB_TOKEN || !env.REPO_OWNER || !env.REPO_NAME) return { skipped: true };
  const branch = env.REPO_BRANCH || "main";
  const url = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/actions/workflows/deploy-pages.yml/dispatches`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "ig-admin-worker",
    },
    body: JSON.stringify({ ref: branch }),
  });
  if (resp.status === 204) return { ok: true };
  // 404 = workflow missing / Actions disabled — non-fatal for content write
  return { ok: false, status: resp.status, body: (await resp.text()).slice(0, 200) };
}

async function saveArticlesDoc(env, data, sha, user) {
  data.version = 1;
  data.updatedAt = new Date().toISOString();
  await githubPutFile(
    env,
    "assets/external-articles.json",
    JSON.stringify(data, null, 2) + "\n",
    sha,
    `content: harici yazilar guncellendi (${user})`
  );
  // Fire-and-forget Pages refresh (errors logged via return; caller may ignore)
  try {
    await triggerPagesDeploy(env);
  } catch (_) {
    /* content write already succeeded */
  }
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return withCors(req, new Response(null, { status: 204 }), env);
    }

    const url = new URL(req.url);
    const ip = req.headers.get("cf-connecting-ip") || "anon";

    try {
      if (url.pathname === "/auth/login") {
        if (!env.GITHUB_CLIENT_ID || !env.SESSION_SECRET) {
          return json({ error: "OAuth yapılandırılmamış. Secrets eksik." }, 503);
        }
        if (!rateLimit(`login:${ip}`, 10)) return json({ error: "Çok fazla istek" }, 429);
        const redirect = `${url.origin}/auth/callback`;
        const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
        const gh = new URL("https://github.com/login/oauth/authorize");
        gh.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
        gh.searchParams.set("redirect_uri", redirect);
        gh.searchParams.set("scope", "read:user");
        gh.searchParams.set("state", state);
        return new Response(null, {
          status: 302,
          headers: {
            location: gh.toString(),
            "set-cookie": oauthStateCookie(state),
          },
        });
      }

      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state") || "";
        const expected = readCookie(req, "ig_oauth_state");
        if (!code) return json({ error: "code yok" }, 400);
        if (!state || !expected || state !== expected) {
          return json({ error: "OAuth state doğrulaması başarısız" }, 403);
        }
        const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });
        const tokenData = await tokenResp.json();
        if (!tokenData.access_token) return json({ error: "token alınamadı" }, 400);
        const userResp = await fetch("https://api.github.com/user", {
          headers: {
            authorization: `Bearer ${tokenData.access_token}`,
            "user-agent": "ig-admin-worker",
            accept: "application/vnd.github+json",
          },
        });
        const user = await userResp.json();
        const login = user.login;
        const allowedLogins = (env.ALLOWED_GITHUB_USERS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        const allowedIds = (env.ALLOWED_GITHUB_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
        const loginOk = allowedLogins.includes(String(login || "").toLowerCase());
        const idOk = allowedIds.length ? allowedIds.includes(String(user.id || "")) : true;
        if (!loginOk || !idOk) {
          return json({ error: "Bu GitHub hesabının yayın yetkisi yok." }, 403);
        }
        const { token } = await makeSession(env, login, user.id);
        const headers = new Headers({
          location: safeAdminRedirect(env),
          "set-cookie": sessionCookie(token),
        });
        headers.append("set-cookie", oauthStateCookie("", true));
        return new Response(null, { status: 302, headers });
      }

      if (url.pathname === "/auth/logout" && req.method === "POST") {
        const res = json({ ok: true });
        const headers = new Headers(res.headers);
        headers.set("set-cookie", sessionCookie("", true));
        return withCors(req, new Response(res.body, { status: 200, headers }), env);
      }

      if (url.pathname === "/auth/me") {
        const session = await readSession(env, req);
        if (!session) return withCors(req, json({ authenticated: false }, 401), env);
        return withCors(req, json({ authenticated: true, user: session.u, csrf: session.csrf }), env);
      }

      if (url.pathname === "/api/fetch-meta" && req.method === "POST") {
        const session = await readSession(env, req);
        if (!session) return withCors(req, json({ error: "Yetkisiz" }, 401), env);
        requireCsrf(session, req);
        if (!rateLimit(`meta:${session.u}`, 20)) return withCors(req, json({ error: "Limit aşıldı" }, 429), env);
        const body = await req.json();
        try {
          const meta = await fetchMeta(String(body.url || ""));
          return withCors(req, json({ ok: true, article: meta }), env);
        } catch (err) {
          return withCors(
            req,
            json({ ok: false, error: String(err.message || err), manualRequired: true }, 422),
            env
          );
        }
      }

      if (url.pathname === "/api/articles" && req.method === "GET") {
        const session = await readSession(env, req);
        if (!session) return withCors(req, json({ error: "Yetkisiz" }, 401), env);
        const { data } = await loadArticlesDoc(env);
        return withCors(req, json(data), env);
      }

      if (url.pathname === "/api/articles" && req.method === "POST") {
        const session = await readSession(env, req);
        if (!session) return withCors(req, json({ error: "Yetkisiz" }, 401), env);
        requireCsrf(session, req);
        if (!rateLimit(`write:${session.u}`, 20)) return withCors(req, json({ error: "Limit aşıldı" }, 429), env);
        const cl = Number(req.headers.get("content-length") || 0);
        if (cl > 800_000) return withCors(req, json({ error: "İstek çok büyük" }, 413), env);
        const incoming = await req.json();
        if (!incoming || !Array.isArray(incoming.articles)) {
          return withCors(req, json({ error: "Geçersiz gövde" }, 400), env);
        }
        const { file, data } = await loadArticlesDoc(env);
        try {
          data.articles = mergeArticles(data.articles, incoming.articles);
        } catch (err) {
          return withCors(req, json({ error: String(err.message || err) }, 400), env);
        }
        await saveArticlesDoc(env, data, file?.sha, session.u);
        return withCors(req, json({ ok: true, count: data.articles.length }), env);
      }

      if (url.pathname === "/api/articles/upsert" && req.method === "POST") {
        const session = await readSession(env, req);
        if (!session) return withCors(req, json({ error: "Yetkisiz" }, 401), env);
        requireCsrf(session, req);
        if (!rateLimit(`write:${session.u}`, 20)) return withCors(req, json({ error: "Limit aşıldı" }, 429), env);
        const body = await req.json();
        let art;
        try {
          art = sanitizeArticle(body.article || body);
        } catch (err) {
          return withCors(req, json({ error: String(err.message || err) }, 400), env);
        }
        const { file, data } = await loadArticlesDoc(env);
        const key = normalizeUrl(art.url).key;
        const idx = data.articles.findIndex((a) => {
          try {
            return normalizeUrl(a.url).key === key || a.id === art.id;
          } catch {
            return a.id === art.id;
          }
        });
        if (idx >= 0) {
          art.id = data.articles[idx].id || art.id;
          art.createdAt = data.articles[idx].createdAt || art.createdAt;
          data.articles[idx] = art;
        } else {
          // duplicate check
          const dup = data.articles.some((a) => {
            try {
              return normalizeUrl(a.url).key === key;
            } catch {
              return false;
            }
          });
          if (dup) return withCors(req, json({ error: "Bu URL zaten kayıtlı" }, 409), env);
          data.articles.unshift(art);
        }
        await saveArticlesDoc(env, data, file?.sha, session.u);
        return withCors(req, json({ ok: true, article: art }), env);
      }

      if (url.pathname === "/api/discovery-queue" && req.method === "GET") {
        const session = await readSession(env, req);
        if (!session) return withCors(req, json({ error: "Yetkisiz" }, 401), env);
        const file = await githubGetFile(env, "assets/data/discovery-queue.json");
        if (!file) return withCors(req, json({ queue: [], note: "Kuyruk dosyası yok" }), env);
        const data = JSON.parse(decodeGithubContent(file));
        return withCors(req, json(data), env);
      }

      if (url.pathname === "/api/health") {
        // CORS zorunlu: admin sayfası Pages origin'inden health okur.
        // Kök "/" ok yanıtı OAuth kanıtı değildir; yalnızca oauthConfigured kullanılmalı.
        return withCors(
          req,
          json({
            service: "ig-admin-api",
            ok: true,
            oauthConfigured: Boolean(env.GITHUB_CLIENT_ID && env.SESSION_SECRET),
            githubWriteConfigured: Boolean(env.GITHUB_TOKEN && env.REPO_OWNER && env.REPO_NAME),
          }),
          env
        );
      }

      return withCors(req, json({ service: "ig-admin-api", ok: true }), env);
    } catch (err) {
      const msg = String(err.message || err);
      const status = msg.includes("CSRF") ? 403 : msg.includes("Yetkisiz") ? 401 : 500;
      return withCors(req, json({ error: msg }, status), env);
    }
  },
};
