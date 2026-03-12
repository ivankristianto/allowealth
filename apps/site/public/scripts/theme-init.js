(function () {
  function applyTheme() {
    var html = document.documentElement;
    var themePreference = html.getAttribute('data-theme-preference');

    if (html.getAttribute('data-theme-server') === 'true') {
      var serverTheme = html.getAttribute('data-theme');
      if (themePreference === 'monochrome' || serverTheme === 'monochrome') {
        html.setAttribute('data-theme', 'light');
        html.style.filter = 'grayscale(100%)';
      } else {
        html.style.filter = '';
      }
      return;
    }

    if (themePreference === 'system') {
      html.style.filter = '';
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.setAttribute('data-theme', 'dark');
        return;
      }

      html.setAttribute('data-theme', 'light');
      return;
    }

    if (themePreference === 'light' || themePreference === 'dark') {
      html.style.filter = '';
      html.setAttribute('data-theme', themePreference);
      return;
    }

    if (themePreference === 'monochrome') {
      html.setAttribute('data-theme', 'light');
      html.style.filter = 'grayscale(100%)';
      return;
    }

    html.style.filter = '';
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
