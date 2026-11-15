/* Decides, before the page is drawn, whether to show the loading screen.
   Loaded in <head> without async or defer so the page never flashes first.
   The rest of the loader is in js/loader.js and css/loader.css. */

(function () {
  // SETTING: how often the loading screen appears.
  //   'session'  once per browser session (a new tab or a browser restart shows it again)
  //   'always'   on every page load
  var SHOW = 'session';

  var root = document.documentElement;
  var alreadyShown = false;

  if (SHOW === 'session') {
    // Storage can be blocked (private mode, strict settings). The loader then shows on each page load.
    try {
      alreadyShown = sessionStorage.getItem('rtwc-loader-shown') === '1';
      sessionStorage.setItem('rtwc-loader-shown', '1');
    } catch (error) {
      alreadyShown = false;
    }
  }

  if (!alreadyShown) root.classList.add('show-loader');
})();
