/* Preserve the existing LIGHT appearance by default. Avoid theme flash. */
(function () {
  var preference = null;
  try { preference = localStorage.getItem('ig-theme'); } catch (_) {}
  document.documentElement.dataset.theme = preference === 'dark' ? 'dark' : 'light';
})();
