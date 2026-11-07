/**
 * YouTube videoları — assets/videos.json (RSS senkronu).
 * İstemci tarafında YouTube Data API anahtarı kullanılmaz.
 */
(function () {
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardHtml(video) {
    const title = escapeHtml(video.title);
    const url = escapeHtml(video.url);
    const thumb = escapeHtml(video.thumbnail || "");
    const date = video.publishedAt
      ? new Date(video.publishedAt).toLocaleDateString("tr-TR", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";
    return (
      '<a href="' +
      url +
      '" target="_blank" rel="noopener noreferrer" class="article-card video-link">' +
      '<div class="article-image" style="aspect-ratio:16/9;position:relative;overflow:hidden;">' +
      '<img src="' +
      thumb +
      '" alt="' +
      title +
      '" width="480" height="270" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src=\'static/ibrahimgunduz-480.webp\';">' +
      '<div class="play-button-overlay"><i class="fas fa-play-circle" aria-hidden="true"></i></div>' +
      "</div>" +
      '<div class="article-content">' +
      '<h3 class="article-title">' +
      title +
      "</h3>" +
      (date ? '<p class="article-meta-line">' + escapeHtml(date) + "</p>" : "") +
      '<span class="read-more">İzle →</span>' +
      "</div></a>"
    );
  }

  function initHomeSlider(container) {
    const sliderContainer = container.closest(".articles-slider");
    if (!sliderContainer) return;
    const prevBtn = sliderContainer.querySelector(".article-prev");
    const nextBtn = sliderContainer.querySelector(".article-next");
    const scrollAmount = 325;
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      });
    }
  }

  function render(videos) {
    const home = document.getElementById("youtube-videos-container");
    const grid = document.getElementById("all-videos-grid");

    if (home) {
      const list = videos.slice(0, 12);
      if (!list.length) {
        home.innerHTML = "<p style='text-align:center;'>Video bulunamadı.</p>";
      } else {
        home.innerHTML = list.map(cardHtml).join("");
        initHomeSlider(home);
      }
    }

    if (grid) {
      if (!videos.length) {
        grid.innerHTML = "<p style='text-align:center;'>Video arşivi henüz boş.</p>";
      } else {
        grid.innerHTML = videos.map(cardHtml).join("");
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const home = document.getElementById("youtube-videos-container");
    const grid = document.getElementById("all-videos-grid");
    if (!home && !grid) return;

    fetch("assets/videos.json")
      .then(function (r) {
        if (!r.ok) throw new Error("Video listesi yüklenemedi (" + r.status + ")");
        return r.json();
      })
      .then(function (data) {
        const videos = Array.isArray(data) ? data : data.videos || [];
        render(videos);
      })
      .catch(function (err) {
        const msg =
          '<p class="feed-error" style="text-align:center;color:#e74c3c;">Videolar şu an gösterilemiyor. ' +
          escapeHtml(err.message) +
          "</p>";
        if (home) home.innerHTML = msg;
        if (grid) grid.innerHTML = msg;
      });
  });
})();
