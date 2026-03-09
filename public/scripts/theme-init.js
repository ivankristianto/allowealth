(function () {
  function applyTheme() {
    var html = document.documentElement;

    if (html.getAttribute('data-theme-server') === 'true') {
      var serverTheme = html.getAttribute('data-theme');
      if (serverTheme === 'monochrome') {
        html.setAttribute('data-theme', 'light');
        html.style.filter = 'grayscale(100%)';
      } else {
        html.style.filter = '';
      }
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
