/* Hides the loading screen once the page has loaded, then removes it.
   js/loader-init.js decides whether it is shown at all. */

(() => {
  const MIN_VISIBLE_MS = 1200; // long enough for the logo animation to finish
  const MAX_VISIBLE_MS = 4000; // a slow image or embed can never keep visitors waiting longer
  const FADE_MS = 300;
  const REDUCED_MOTION_FADE_MS = 150;

  const root = document.documentElement;
  const loader = document.getElementById('page-loader');
  if (!loader) return;

  if (!root.classList.contains('show-loader')) {
    loader.remove();
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minimum = reducedMotion ? 0 : MIN_VISIBLE_MS;
  const fade = reducedMotion ? REDUCED_MOTION_FADE_MS : FADE_MS;
  let hiding = false;

  function hide() {
    if (hiding) return;
    hiding = true;
    // Removed first so a screen reader is not left with a stale "Loading" message.
    loader.querySelector('.visually-hidden').remove();
    loader.classList.add('is-hiding');
    setTimeout(() => {
      loader.remove();
      root.classList.remove('show-loader'); // page scrolling works again
    }, fade);
  }

  // performance.now() counts from the start of navigation, which is when the loader appeared.
  const hideWhenSeen = () => setTimeout(hide, Math.max(0, minimum - performance.now()));

  if (document.readyState === 'complete') hideWhenSeen();
  else window.addEventListener('load', hideWhenSeen);

  setTimeout(hide, Math.max(0, MAX_VISIBLE_MS - performance.now()));
})();
