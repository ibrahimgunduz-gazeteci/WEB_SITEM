/**
 * Dinamik makale sistemi — legacy yazilar.json + external-articles.json
 * Eski haber.html?file=... URL'leri korunur.
 * Haricî yazılar kaynak sitesine açılır (metin kopyalanmaz).
 */
(function () {
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeSearch(str) {
    let normalized = String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    normalized = normalized.toLowerCase();
    return normalized
      .replace(/ı/g, "i")
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

  function legacyToCard(article) {
    return {
      kind: "legacy",
      title: article.title,
      thumbnail: article.thumbnail || "static/ibrahimgunduz.png",
      href: "haber.html?file=" + encodeURIComponent(article.fileName),
      excerpt: "Yazının detaylarını okumak için bağlantıya tıklayın.",
      meta: "",
      sortDate: "",
      fileName: article.fileName,
    };
  }

  function externalToCard(article) {
    return {
      kind: "external",
      title: article.title,
      thumbnail: article.image || "static/ibrahimgunduz.png",
      href: article.url,
      external: true,
      excerpt: article.excerpt || "Yayınlandığı sitede okuyun.",
      meta: [article.publisher, formatDate(article.publishedAt)].filter(Boolean).join(" · "),
      sortDate: article.publishedAt || article.createdAt || "",
      id: article.id,
    };
  }

  function cardHtml(item) {
    var thumb = encodeAssetPath(item.thumbnail);
    if (item.kind === "external" && item.thumbnail && /^https?:/i.test(item.thumbnail)) {
      thumb = escapeHtml(item.thumbnail);
    }
    var rel = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    var meta = item.meta
      ? '<p class="article-meta-line">' + escapeHtml(item.meta) + "</p>"
      : "";
    var badge =
      item.kind === "external"
        ? '<span class="article-source-badge">Kaynak site</span>'
        : "";
    return (
      '<div class="article-card">' +
      '<div class="article-image">' +
      badge +
      '<img src="' +
      thumb +
      '" alt="' +
      escapeHtml(item.title) +
      '" loading="lazy" width="400" height="240" onerror="this.onerror=null;this.src=\'static/ibrahimgunduz.png\';">' +
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
      ">" +
      (item.external ? "Yazının Tamamını Oku →" : "Devamını Oku →") +
      "</a>" +
      "</div></div>"
    );
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
    var recent = items.slice(0, 30);
    sliderWrapper.innerHTML = recent.map(cardHtml).join("");
    sliderContainer.appendChild(sliderWrapper);
    initArticleSlider(sliderContainer, sliderWrapper);
  }

  function renderArticlesGrid(items) {
    var grid = document.getElementById("all-articles-grid");
    var searchInput = document.getElementById("articleSearch");
    if (!grid) return;

    function display(list) {
      grid.innerHTML = list.map(cardHtml).join("") || '<p style="text-align:center;padding:24px;">Sonuç bulunamadı.</p>';
    }

    display(items);

    if (searchInput) {
      searchInput.addEventListener("input", function (e) {
        var term = normalizeSearch(e.target.value);
        if (!term) {
          display(items);
          return;
        }
        display(
          items.filter(function (a) {
            return (
              normalizeSearch(a.title).includes(term) ||
              normalizeSearch(a.meta).includes(term) ||
              normalizeSearch(a.excerpt).includes(term)
            );
          })
        );
      });
    }
  }

  function mergeLists(legacy, external) {
    var extCards = (external.articles || [])
      .filter(function (a) {
        return a.status === "published";
      })
      .map(externalToCard);

    var legacyCards = (legacy || []).map(legacyToCard);

    // External first when dated; otherwise keep legacy order after dated externals
    var dated = extCards.filter(function (c) {
      return c.sortDate;
    });
    dated.sort(function (a, b) {
      return a.sortDate < b.sortDate ? 1 : -1;
    });
    var undatedExt = extCards.filter(function (c) {
      return !c.sortDate;
    });
    return dated.concat(undatedExt, legacyCards);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var needsLegacy =
      document.querySelector("#featured-articles .articles-slider") ||
      document.getElementById("all-articles-grid");
    if (!needsLegacy) return;

    Promise.all([
      fetch("assets/yazilar.json").then(function (r) {
        if (!r.ok) throw new Error("yazilar.json " + r.status);
        return r.json();
      }),
      fetch("assets/external-articles.json")
        .then(function (r) {
          return r.ok ? r.json() : { articles: [] };
        })
        .catch(function () {
          return { articles: [] };
        }),
    ])
      .then(function (results) {
        var items = mergeLists(results[0], results[1]);
        if (window.location.pathname.indexOf("tum-yazilar.html") !== -1) {
          renderArticlesGrid(items);
        } else {
          renderHomeSlider(items);
        }
      })
      .catch(function (err) {
        console.error("Yazı listesi yüklenirken hata:", err);
        var container =
          document.querySelector("#featured-articles .articles-slider") ||
          document.getElementById("all-articles-grid");
        if (container) {
          container.innerHTML =
            '<p style="text-align:center;padding:20px;">Yazılar şu an yüklenemiyor.</p>';
        }
      });
  });
})();
