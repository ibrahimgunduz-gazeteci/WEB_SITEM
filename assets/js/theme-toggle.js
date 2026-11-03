/* No dependencies. Adds a keyboard-accessible control to existing page header. */
(function () {
  var icons = {
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10z"/></svg>'
  };
  function mount() {
    var header = document.querySelector('header .header-container');
    if (!header || header.querySelector('.ig-theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'ig-theme-toggle';
    var mobileButton = header.querySelector('.mobile-menu-btn');
    if (mobileButton) header.insertBefore(button, mobileButton);
    else header.appendChild(button);
    function update() {
      var dark = document.documentElement.dataset.theme === 'dark';
      button.innerHTML = dark ? icons.dark : icons.light;
      button.setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
      button.setAttribute('title', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
      button.setAttribute('aria-pressed', String(dark));
    }
    button.addEventListener('click', function () {
      var isDark = document.documentElement.dataset.theme === 'dark';
      var next = isDark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('ig-theme', next); } catch (_) {}
      update();
    });
    update();
  }
  function markActiveNav() {
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('header nav a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('#')[0].split('/').pop().toLowerCase();
      var active = false;
      if (path === 'index.html' || path === '') {
        active = href === 'index.html' || href === '' || (a.getAttribute('href') || '') === 'index.html';
        if ((a.getAttribute('href') || '').indexOf('#') === 0) active = false;
        if ((a.getAttribute('href') || '') === 'index.html') active = true;
      } else if (href && href === path) {
        active = true;
      }
      if (active) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('is-active');
        a.removeAttribute('aria-current');
      }
    });
  }
  function boot() {
    mount();
    markActiveNav();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
