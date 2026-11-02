/**
 * Node tests for cloudflare-worker/src/article_utils.js
 * Run: node --test tests/test_article_utils_node.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeFetchUrl,
  isPrivateHost,
  mergeArticles,
  normalizeUrl,
  sanitizeArticle,
  stripHtml,
} from "../cloudflare-worker/src/article_utils.js";

test("normalizeUrl strips www and hash", () => {
  const n = normalizeUrl("https://www.kisadalga.net/haber/x/#frag");
  assert.equal(n.key, "https://kisadalga.net/haber/x");
  assert.equal(n.priority, true);
});

test("SSRF private hosts blocked", () => {
  assert.equal(isPrivateHost("127.0.0.1"), true);
  assert.equal(isPrivateHost("192.168.1.1"), true);
  assert.equal(isPrivateHost("kisadalga.net"), false);
  assert.throws(() => assertSafeFetchUrl("http://127.0.0.1/secret"));
  assert.throws(() => assertSafeFetchUrl("https://169.254.169.254/latest"));
});

test("sanitize strips HTML / XSS", () => {
  const art = sanitizeArticle({
    url: "https://kisadalga.net/haber/a",
    title: '<script>alert(1)</script>Başlık',
    excerpt: '<img src=x onerror=alert(1)>Özet',
    status: "draft",
  });
  assert.equal(art.title.includes("<script>"), false);
  assert.equal(art.excerpt.includes("<img"), false);
  assert.ok(art.title.includes("Başlık"));
});

test("mergeArticles rejects duplicate URLs", () => {
  assert.throws(() =>
    mergeArticles(
      [],
      [
        { url: "https://kisadalga.net/haber/a", title: "A", status: "draft" },
        { url: "https://www.kisadalga.net/haber/a/", title: "A2", status: "draft" },
      ]
    )
  );
});

test("stripHtml basic", () => {
  assert.equal(stripHtml("<b>x</b>"), "x");
});
