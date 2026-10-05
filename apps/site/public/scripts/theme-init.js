// Loaded parser-blocking in <head> so the saved or system theme applies before first paint.
(function () {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('theme');
  } catch {
    // localStorage may be unavailable (e.g. private browsing restrictions)
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme =
    savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : prefersDark ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', theme);
})();
