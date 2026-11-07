/**
 * Dinamik makale sistemi — legacy yazilar.json + external-articles.json
 * Varsayılan sıra: siteye en son eklenen → en eski (sitePublishedAt / createdAt).
 * İki İngilizce arşiv kaydı her zaman en sonda kalır.
 */
(function () {
  var ASSET_BUST = "v=3.0&t=" + Date.now();
  var EN_LINKS = {
    "eng_article.html": true,
    "eng_media_landscape.html": true,
  };

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function decodeEntities(str) {
    return String(str || "")
      .replace(/&amp;/g, "&")
      .replace(/&#0?39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#(\d+);/g, function (_, n) {
        return String.fromCharCode(Number(n));
      });
  }

  function normalizeSearch(str) {
    var normalized = decodeEntities(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return normalized
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/i̇/g, "i");
  }

  function encodeAssetPath(path) {
    if (!path) return "static/ibrahimgunduz.png";
    return path
      .split("/")
      .map(function (part) {
        try {
          return encodeURIComponent(part);
        } catch (e) {
          return part;
        }
      })
      .join("/");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" });
  }

  function toSortMs(iso) {
    if (!iso) return null;
    var t = Date.parse(iso);
    return isNaN(t) ? null : t;
  }

  var MONTHS = {
    ocak: 1,
    subat: 2,
    şubat: 2,
    mart: 3,
    nisan: 4,
    mayis: 5,
    mayıs: 5,
    haziran: 6,
    temmuz: 7,
    agustos: 8,
    ağustos: 8,
    eylul: 9,
    eylül: 9,
    ekim: 10,
    kasim: 11,
    kasım: 11,
    aralik: 12,
    aralık: 12,
  };

  /** Extract verified calendar date from legacy title/filename; never invent. */
  function extractLegacyDate(text) {
    var s = String(text || "");
    var m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) {
      var d1 = Number(m[1]);
      var mo1 = Number(m[2]);
      var y1 = Number(m[3]);
      var dt1 = new Date(y1, mo1 - 1, d1);
      if (dt1.getFullYear() === y1 && dt1.getMonth() === mo1 - 1 && dt1.getDate() === d1) {
        return dt1.toISOString();
      }
    }
    m = s.match(/(\d{1,2})\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*(\d{4})/i);
    if (m) {
      var day = Number(m[1]);
      var monRaw = normalizeSearch(m[2]);
      var year = Number(m[3]);
      var month = null;
      Object.keys(MONTHS).forEach(function (k) {
        var nk = normalizeSearch(k);
        if (monRaw === nk || monRaw.indexOf(nk) === 0 || nk.indexOf(monRaw) === 0) month = MONTHS[k];
      });
      if (month) {
        var dt2 = new Date(year, month - 1, day);
        if (dt2.getFullYear() === year && dt2.getMonth() === month - 1 && dt2.getDate() === day) {
          return dt2.toISOString();
        }
      }
    }
    return null;
  }

  function isEnglishLegacy(article) {
    var link = String(article.link || "");
    var file = String(article.fileName || "");
    return Boolean(EN_LINKS[link] || EN_LINKS[file] || /eng_/i.test(link) || /eng_/i.test(file));
  }

  function safeArticleId(id) {
    var s = String(id || "").trim();
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(s)) return null;
    return s;
  }

  function legacyToCard(article, index) {
    var href = article.link
      ? article.link
      : "haber.html?file=" + encodeURIComponent(article.fileName);
    var extracted = extractLegacyDate((article.fileName || "") + " " + (article.title || ""));
    return {
      kind: "legacy",
      title: article.title,
      thumbnail: article.thumbnail || "static/ibrahimgunduz-480.webp",
      thumbnail2x: article.thumbnail2x || "",
      href: href,
      excerpt: decodeEntities(article.excerpt || "Yazının detaylarını okumak için bağlantıya tıklayın."),
      meta: extracted ? formatDate(extracted) : "",
      publisher: "",
      sortSiteMs: toSortMs(extracted),
      sortSourceMs: toSortMs(extracted),
      stableIndex: index,
      pinLast: isEnglishLegacy(article),
      dated: Boolean(extracted),
      id: null,
      external: false,
    };
  }

  function externalToCard(article) {
    var siteAt = article.sitePublishedAt || article.createdAt || "";
    var sourceAt = article.publishedAt || "";
    var siteLabel = formatDate(siteAt);
    var sourceLabel = formatDate(sourceAt);
    var metaBits = [article.publisher];
    if (sourceLabel) metaBits.push("Kaynak: " + sourceLabel);
    if (siteLabel) metaBits.push("Sitede: " + siteLabel);
    return {
      kind: "external",
      title: article.title,
      thumbnail: article.image || "static/ibrahimgunduz-480.webp",
      thumbnail2x: "",
      href: article.url,
      external: true,
      excerpt: decodeEntities(article.excerpt || "Yayınlandığı sitede okuyun."),
      meta: metaBits.filter(Boolean).join(" · "),
      publisher: article.publisher || "",
      sortSiteMs: toSortMs(siteAt),
      sortSourceMs: toSortMs(sourceAt) || toSortMs(siteAt),
      stableIndex: 0,
      pinLast: false,
      dated: Boolean(siteAt || sourceAt),
      id: article.id || null,
    };
  }

  function cardHtml(item) {
    var thumb = encodeAssetPath(item.thumbnail);
    var thumb2x = item.thumbnail2x ? encodeAssetPath(item.thumbnail2x) : "";
    if (item.kind === "external" && item.thumbnail && /^https?:/i.test(item.thumbnail)) {
      thumb = escapeHtml(item.thumbnail);
      thumb2x = "";
    }
    var srcset = thumb2x
      ? ' srcset="' + thumb + " 400w, " + thumb2x + ' 800w" sizes="(max-width: 600px) 90vw, 400px"'
      : "";
    var rel = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    var meta = item.meta
      ? '<p class="article-meta-line">' + escapeHtml(item.meta) + "</p>"
      : "";
    var idAttr = item.id ? ' id="article-' + escapeHtml(item.id) + '" data-article-id="' + escapeHtml(item.id) + '"' : "";
    return (
      '<div class="article-card"' +
      idAttr +
      ">" +
      '<div class="article-image">' +
      '<img src="' +
      thumb +
      '"' +
      srcset +
      ' alt="' +
      escapeHtml(item.title) +
      '" loading="lazy" width="400" height="240" decoding="async" onerror="this.onerror=null;this.removeAttribute(\'srcset\');this.src=\'static/ibrahimgunduz-480.webp\';">' +
      "</div>" +
      '<div class="article-content">' +
      '<h3 class="article-title">' +
      escapeHtml(item.title) +
      "</h3>" +
      meta +
      '<p class="article-excerpt">' +
      escapeHtml(item.excerpt) +
      "</p>" +
      '<a href="' +
      escapeHtml(item.href) +
      '" class="read-more"' +
      rel +
      ">Devamını Oku</a>" +
      "</div></div>"
    );
  }

  function compareCards(a, b, mode) {
    if (a.pinLast !== b.pinLast) return a.pinLast ? 1 : -1;
    var aMs;
    var bMs;
    if (mode === "source-asc") {
      aMs = a.sortSourceMs;
      bMs = b.sortSourceMs;
      if (aMs != null && bMs != null && aMs !== bMs) return aMs - bMs;
    } else if (mode === "source-desc") {
      aMs = a.sortSourceMs;
      bMs = b.sortSourceMs;
      if (aMs != null && bMs != null && aMs !== bMs) return bMs - aMs;
    } else {
      aMs = a.sortSiteMs;
      bMs = b.sortSiteMs;
      if (aMs != null && bMs != null && aMs !== bMs) return bMs - aMs;
    }
    if (aMs != null && bMs == null) return -1;
    if (aMs == null && bMs != null) return 1;
    return (a.stableIndex || 0) - (b.stableIndex || 0);
  }

  function mergeLists(legacy, external, mode) {
    var extCards = (external.articles || [])
      .filter(function (a) {
        return a.status === "published";
      })
      .map(externalToCard);

    var legacyCards = (legacy || []).map(function (a, i) {
      return legacyToCard(a, i);
    });

    var all = extCards.concat(legacyCards);
    all.sort(function (a, b) {
      return compareCards(a, b, mode || "site-desc");
    });
    return all;
  }

  function initArticleSlider(container, wrapper) {
    container.querySelectorAll(".article-nav-btn").forEach(function (btn) {
      btn.remove();
    });
    var prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left" aria-hidden="true"></i>';
    prevBtn.className = "article-nav-btn article-prev";
    prevBtn.setAttribute("aria-label", "Önceki yazılar");
    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';
    nextBtn.className = "article-nav-btn article-next";
    nextBtn.setAttribute("aria-label", "Sonraki yazılar");
    var scrollAmount = Math.max(280, wrapper.offsetWidth / 3);
    nextBtn.addEventListener("click", function () {
      wrapper.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
    prevBtn.addEventListener("click", function () {
      wrapper.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
    container.appendChild(prevBtn);
    container.appendChild(nextBtn);
  }

  function renderHomeSlider(items) {
    var sliderContainer = document.querySelector("#featured-articles .articles-slider");
    if (!sliderContainer) return;
    sliderContainer.innerHTML = "";
    var sliderWrapper = document.createElement("div");
    sliderWrapper.className = "articles-slider-wrapper";
    var recent = items.filter(function (i) {
      return !i.pinLast;
    }).slice(0, 30);
    sliderWrapper.innerHTML = recent.map(cardHtml).join("");
    sliderContainer.appendChild(sliderWrapper);
    initArticleSlider(sliderContainer, sliderWrapper);
  }

  function showExtWarning(msg) {
    var grid = document.getElementById("all-articles-grid");
    var host = grid || document.querySelector("#featured-articles .articles-slider");
    if (!host) return;
    var existing = document.getElementById("ext-articles-warn");
    if (existing) existing.remove();
    var box = document.createElement("div");
    box.id = "ext-articles-warn";
    box.setAttribute("role", "status");
    box.style.cssText =
      "margin:12px 0 20px;padding:12px 16px;border:1px solid #c9892e;background:#fff8e8;color:#5c3d0a;border-radius:8px;font-size:14px;";
    box.textContent = msg;
    if (grid) grid.parentNode.insertBefore(box, grid);
    else host.parentNode.insertBefore(box, host);
  }

  function focusArticleByQuery(items) {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("article");
    var id = safeArticleId(raw);
    var notice = document.getElementById("article-deep-link-msg");
    if (notice) notice.remove();
    if (!raw) return;
    var grid = document.getElementById("all-articles-grid");
    if (!grid) return;
    if (!id) {
      var bad = document.createElement("p");
      bad.id = "article-deep-link-msg";
      bad.style.cssText = "text-align:center;padding:12px;color:#8a1f1f;";
      bad.textContent = "Geçersiz yazı bağlantısı.";
      grid.parentNode.insertBefore(bad, grid);
      return;
    }
    var card = document.getElementById("article-" + id);
    if (!card) {
      var missing = document.createElement("p");
      missing.id = "article-deep-link-msg";
      missing.style.cssText = "text-align:center;padding:12px;color:#8a1f1f;";
      missing.textContent = "Bu yazı sitede bulunamadı veya henüz yayında değil (id: " + id + ").";
      grid.parentNode.insertBefore(missing, grid);
      return;
    }
    card.classList.add("article-card--focus");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(function () {
      card.classList.remove("article-card--focus");
    }, 4500);
  }

  function ensureSortControl() {
    var searchBox = document.querySelector(".search-container");
    if (!searchBox || document.getElementById("articleSort")) return null;
    var sel = document.createElement("select");
    sel.id = "articleSort";
    sel.setAttribute("aria-label", "Sıralama");
    sel.style.cssText = "margin-left:12px;padding:12px 14px;border-radius:30px;border:1px solid #ddd;font-size:14px;max-width:100%;";
    sel.innerHTML =
      '<option value="site-desc">En son eklenenler</option>' +
      '<option value="source-desc">Kaynak tarihi: yeni → eski</option>' +
      '<option value="source-asc">Kaynak tarihi: eski → yeni</option>';
    searchBox.appendChild(sel);
    return sel;
  }

  function renderArticlesGrid(allItems, mode) {
    var grid = document.getElementById("all-articles-grid");
    var searchInput = document.getElementById("articleSearch");
    if (!grid) return;

    var items = allItems.slice();

    function display(list) {
      grid.innerHTML =
        list.map(cardHtml).join("") ||
        '<p style="text-align:center;padding:24px;">Sonuç bulunamadı.</p>';
    }

    display(items);
    focusArticleByQuery(items);

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "1";
      searchInput.addEventListener("input", function (e) {
        var term = normalizeSearch(e.target.value);
        if (!term) {
          display(items);
          focusArticleByQuery(items);
          return;
        }
        var filtered = items.filter(function (a) {
          return (
            normalizeSearch(a.title).indexOf(term) !== -1 ||
            normalizeSearch(a.meta).indexOf(term) !== -1 ||
            normalizeSearch(a.excerpt).indexOf(term) !== -1 ||
            normalizeSearch(a.publisher).indexOf(term) !== -1
          );
        });
        display(filtered);
        if (!filtered.length) {
          grid.innerHTML =
            '<p style="text-align:center;padding:24px;">Arama sonucu yok. Yazı listesi yüklü (' +
            items.length +
            " kayıt); farklı bir kelime deneyin.</p>";
        }
      });
    } else if (searchInput && searchInput.value) {
      searchInput.dispatchEvent(new Event("input"));
    }
  }

  function fetchJson(path, label) {
    return fetch(path + (path.indexOf("?") >= 0 ? "&" : "?") + ASSET_BUST, {
      cache: "no-store",
      credentials: "same-origin",
    }).then(function (r) {
      if (!r.ok) {
        var err = new Error(label + " HTTP " + r.status);
        err.status = r.status;
        err.label = label;
        throw err;
      }
      return r.json().then(function (data) {
        return { ok: true, data: data };
      });
    });
  }

  function boot() {
    var needsLegacy =
      document.querySelector("#featured-articles .articles-slider") ||
      document.getElementById("all-articles-grid");
    if (!needsLegacy) return;

    var sortSel = ensureSortControl();
    var mode = (sortSel && sortSel.value) || "site-desc";
    var legacyData = null;
    var externalData = { articles: [] };
    var extError = null;

    Promise.all([
      fetchJson("assets/yazilar.json", "yazilar.json"),
      fetchJson("assets/external-articles.json", "external-articles.json").catch(function (err) {
        extError = err;
        return { ok: false, data: { articles: [] } };
      }),
    ])
      .then(function (results) {
        if (!results[0].ok) throw new Error("yazilar.json yüklenemedi");
        legacyData = results[0].data;
        externalData = results[1].data || { articles: [] };
        if (extError) {
          showExtWarning(
            "Haricî (yeni) yazılar şu an yüklenemedi (" +
              (extError.status || "ağ") +
              "). Arşiv yazıları gösteriliyor; yeni eklenenler geçici olarak listede olmayabilir."
          );
        } else if (!Array.isArray(externalData.articles)) {
          extError = new Error("invalid");
          externalData = { articles: [] };
          showExtWarning("Haricî yazı verisi bozuk. Arşiv yazıları gösteriliyor.");
        }

        function paint(sortMode) {
          var items = mergeLists(legacyData, externalData, sortMode);
          if (window.location.pathname.indexOf("tum-yazilar.html") !== -1) {
            renderArticlesGrid(items, sortMode);
          } else {
            renderHomeSlider(items);
          }
        }

        paint(mode);
        if (sortSel && !sortSel.dataset.bound) {
          sortSel.dataset.bound = "1";
          sortSel.addEventListener("change", function () {
            paint(sortSel.value);
          });
        }
      })
      .catch(function (err) {
        console.error("Yazı listesi yüklenirken hata:", err);
        var container =
          document.querySelector("#featured-articles .articles-slider") ||
          document.getElementById("all-articles-grid");
        if (container) {
          container.innerHTML =
            '<p style="text-align:center;padding:20px;">Yazılar şu an yüklenemiyor. Lütfen sayfayı yenileyin.</p>';
        }
      });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
