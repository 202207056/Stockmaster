// Apply the saved appearance before styles and React paint the page.
(() => {
  let saved;
  try { saved = localStorage.getItem('stockmaster:theme'); } catch { /* Storage is optional. */ }
  const theme = saved === 'light' || saved === 'dark' ? saved
    : window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
