(function () {
  function applyTheme() {
    const html = document.documentElement;
    const themePreference = html.getAttribute('data-theme-preference');

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

    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem('theme');
    } catch {
      // localStorage may be unavailable (e.g. private browsing restrictions)
    }
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
