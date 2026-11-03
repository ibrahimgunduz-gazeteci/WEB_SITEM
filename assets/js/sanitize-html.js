/**
 * Minimal HTML sanitizer for trusted-legacy article bodies.
 * Strips scripts/handlers; keeps basic content tags used by DOCX converter.
 */
(function (global) {
  var ALLOWED = {
    P: 1, BR: 1, DIV: 1, SPAN: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1,
    H1: 1, H2: 1, H3: 1, H4: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1,
    A: 1, IMG: 1, FIGURE: 1, FIGCAPTION: 1, HR: 1, TABLE: 1, THEAD: 1,
    TBODY: 1, TR: 1, TD: 1, TH: 1, SUP: 1, SUB: 1
  };

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function safeHref(href) {
    var h = String(href || "").trim();
    if (!h) return null;
    var low = h.toLowerCase();
    if (low.startsWith("javascript:") || low.startsWith("data:") || low.startsWith("vbscript:")) return null;
    if (low.startsWith("http://") || low.startsWith("https://") || low.startsWith("mailto:") || low.startsWith("/") || low.startsWith("#")) {
      return h;
    }
    return null;
  }

  function safeSrc(src) {
    var s = String(src || "").trim();
    if (!s) return null;
    var low = s.toLowerCase();
    if (low.startsWith("javascript:") || low.startsWith("data:")) return null;
    if (low.startsWith("http://") || low.startsWith("https://") || low.startsWith("assets/") || low.startsWith("static/") || low.startsWith("/")) {
      return s;
    }
    return null;
  }

  function sanitizeHtml(dirty) {
    var template = document.createElement("template");
    template.innerHTML = String(dirty || "");
    function walk(node) {
      var children = Array.prototype.slice.call(node.childNodes);
      children.forEach(function (child) {
        if (child.nodeType === 8) {
          child.remove();
          return;
        }
        if (child.nodeType === 1) {
          var tag = child.tagName;
          if (!ALLOWED[tag]) {
            // unwrap text
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            child.remove();
            return;
          }
          // strip all on* handlers and style javascript
          Array.prototype.slice.call(child.attributes).forEach(function (attr) {
            var name = attr.name.toLowerCase();
            if (name.indexOf("on") === 0 || name === "srcdoc") {
              child.removeAttribute(attr.name);
              return;
            }
            if (tag === "A" && name === "href") {
              var href = safeHref(attr.value);
              if (!href) child.removeAttribute("href");
              else {
                child.setAttribute("href", href);
                child.setAttribute("rel", "noopener noreferrer");
                if (/^https?:/i.test(href)) child.setAttribute("target", "_blank");
              }
              return;
            }
            if (tag === "IMG" && name === "src") {
              var src = safeSrc(attr.value);
              if (!src) child.removeAttribute("src");
              else child.setAttribute("src", src);
              return;
            }
            if (name === "style" || name === "class" || name === "id" || name === "alt" || name === "title" || name === "width" || name === "height" || name === "colspan" || name === "rowspan") {
              return;
            }
            child.removeAttribute(attr.name);
          });
          walk(child);
        }
      });
    }
    walk(template.content);
    return template.innerHTML;
  }

  global.IGSanitize = { sanitizeHtml: sanitizeHtml, escapeAttr: escapeAttr, safeHref: safeHref, safeSrc: safeSrc };
})(window);
