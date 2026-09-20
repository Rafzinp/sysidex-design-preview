/*
  Responsive menu: hamburger below 1200px opens a left slide-in panel (same behaviour as bushtorm.com).
  Markup: [data-sx-menu-open] buttons in the header + #sx-mm-root (backdrop + .sx-mm panel) at the end of <body>.
  Keyboard: Esc closes, Tab stays inside the panel, arrow keys switch the Menu/Categories tabs.
  The panel closes when a link is followed, the backdrop is clicked, or the window grows to desktop width.
*/
(function () {
  var root = document.getElementById('sx-mm-root');
  if (!root) return;
  var panel = root.querySelector('.sx-mm');
  var backdrop = root.querySelector('.sx-mm-backdrop');
  var openers = Array.prototype.slice.call(document.querySelectorAll('[data-sx-menu-open]'));
  var desktop = window.matchMedia('(min-width: 1200px)');
  var isOpen = false, lastFocus = null;

  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function setInert(on) {
    Array.prototype.slice.call(document.body.children).forEach(function (el) {
      if (el === root || el.id === 'sx-root' || el.tagName === 'SCRIPT') return;
      el.inert = on;
    });
  }

  function open() {
    if (isOpen || desktop.matches) return;
    isOpen = true;
    lastFocus = document.activeElement;
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    panel.removeAttribute('aria-hidden');
    document.documentElement.classList.add('sx-lock');
    setInert(true);
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var closeBtn = panel.querySelector('[data-sx-menu-close]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function close(returnFocus) {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('sx-lock');
    setInert(false);
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (returnFocus !== false) {
      var back = lastFocus && document.contains(lastFocus) ? lastFocus : openers[0];
      if (back && back.focus) back.focus({ preventScroll: true });
    }
  }

  /* ---- open / close ---- */
  openers.forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); open(); }); });
  backdrop.addEventListener('click', function () { close(); });
  panel.addEventListener('click', function (e) {
    if (e.target.closest('[data-sx-menu-close]')) { close(); return; }
    var link = e.target.closest('a[href]');
    if (link) close(false);                              // let the link go; just release the page
  });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('button:not([disabled]), a[href], input:not([disabled])', panel).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  function onDesktop() { if (desktop.matches) close(false); }
  if (desktop.addEventListener) desktop.addEventListener('change', onDesktop); else desktop.addListener(onDesktop);

  /* ---- Menu | Categories tabs ---- */
  var tabs = $$('[role="tab"]', panel);
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var pane = document.getElementById(t.getAttribute('aria-controls'));
      if (pane) pane.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ---- category sub-menus (plus / minus) ---- */
  $$('[data-sx-sub-toggle]', panel).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      var sub = document.getElementById(btn.getAttribute('aria-controls'));
      if (sub) sub.hidden = open;
    });
  });

  /* ---- current page highlight (the Home link matches only the home page itself) ---- */
  function norm(path) { return path.replace(/\/index\.html$/, '/').replace(/(.)\/$/, '$1'); }
  var here = norm(location.pathname);
  $$('a[data-mm-link]', panel).forEach(function (a) {
    var raw;
    try { raw = new URL(a.href, location.href).pathname; } catch (e) { return; }
    var isIndex = /\/$|\/index\.html$/.test(raw);
    var p = norm(raw);
    if (p === here || (!isIndex && p.length > 1 && here.indexOf(p + '/') === 0)) a.setAttribute('aria-current', 'page');
  });
})();
