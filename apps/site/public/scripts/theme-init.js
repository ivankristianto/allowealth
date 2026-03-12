(function () {
  function applyTheme() {
    var html = document.documentElement;
    var themePreference = html.getAttribute('data-theme-preference');

    if (themePreference === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.setAttribute('data-theme', 'dark');
        return;
      }
      html.setAttribute('data-theme', 'light');
      return;
    }

    if (themePreference === 'light' || themePreference === 'dark') {
      html.setAttribute('data-theme', themePreference);
      return;
    }

    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      html.setAttribute('data-theme', savedTheme);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.setAttribute('data-theme', 'dark');
      return;
    }

    html.setAttribute('data-theme', 'light');
  }

  applyTheme();
  document.addEventListener('astro:after-swap', applyTheme);
})();
