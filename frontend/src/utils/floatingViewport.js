/** Space available to movable tools, excluding the mobile navigation/keyboard. */
export function floatingViewport() {
  const width = window.innerWidth;
  const mobile = width < 768;
  const nav = mobile ? document.querySelector('.bottom-navigation')?.getBoundingClientRect().height ?? 0 : 0;
  const orderActions = mobile ? document.querySelector('.trading-mobile-actions')?.getBoundingClientRect().height ?? 0 : 0;
  return { width, height: Math.max(100, Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight) - nav - orderActions) };
}

export function raiseFloatingPanel(element) {
  document.querySelectorAll('[data-floating-active]').forEach(panel => panel.removeAttribute('data-floating-active'));
  element.setAttribute('data-floating-active', 'true');
}
