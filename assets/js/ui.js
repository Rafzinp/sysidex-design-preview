/*
  Sysidex prototype UI: renders cards, listings, search results and logo sections from window.SX (catalog.js).
  All dynamic text (including the visitor's search words) goes through esc() before it is put in the page.
  Hooks (data attributes in the HTML):
    <body data-scope="all|industrial|iot|engineering">   product listing page (products.html / category-*.html)
    [data-latest]                                          home page "Latest Products" grid
    [data-logos="clients|partners" data-limit="8"]         marquee (home / about)
    [data-logo-grid="clients|partners"]                    full logo list page
*/
(function () {
  var SX = window.SX;
  if (!SX) return;
  var ICON = '../assets/icons/';
  var IMG = '../assets/images/';
  var PER_PAGE = 12;
  var uid = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function params() { return new URLSearchParams(location.search); }
  function href(base, obj) {
    var p = new URLSearchParams();
    Object.keys(obj).forEach(function (k) { if (obj[k] !== '' && obj[k] != null) p.set(k, obj[k]); });
    var s = p.toString();
    return base + (s ? '?' + s : '');
  }
  function setHTML(el, html) { el.innerHTML = html; }

  /* ---------- Illustration system (IoT + Engineering) ----------
     Every tile: same 4:3 canvas, blueprint grid, one centered line-art glyph in the category colour
     with an orange accent. Each glyph is unique so no two cards share a visual. */
  var THEME = {
    iot: { ink: '#0d9488', bg1: '#f1fbf9', bg2: '#d9f1ec', line: '#0d9488' },
    engineering: { ink: '#2b3990', bg1: '#f3f4fd', bg2: '#dfe4f8', line: '#2b3990' }
  };
  var ACC = '#f37021';

  function dots(cols, rows, x0, y0, dx, dy, r, fill) {
    var s = '';
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) s += '<circle cx="' + (x0 + i * dx) + '" cy="' + (y0 + j * dy) + '" r="' + r + '" fill="' + fill + '" stroke="none"/>';
    return s;
  }

  var GLYPH = {
    locker: function (t) {
      return '<rect x="-46" y="-56" width="92" height="112" rx="6" fill="#fff"/>' +
        '<rect x="15" y="-56" width="31" height="37" fill="' + ACC + '" fill-opacity=".2" stroke="none"/>' +
        '<path d="M-15 -56V56M15 -56V56M-46 -19H46M-46 19H46"/>' +
        dots(3, 3, -30.5, -37.5, 30.5, 37.5, 2.6, t.ink);
    },
    lockerbank: function (t) {
      return '<rect x="-62" y="-38" width="124" height="76" rx="6" fill="#fff"/>' +
        '<rect x="21" y="-38" width="20" height="38" fill="' + ACC + '" fill-opacity=".2" stroke="none"/>' +
        '<path d="M-41 -38V38M-21 -38V38M0 -38V38M21 -38V38M41 -38V38M-62 0H62"/>' +
        dots(6, 2, -51.5, -19, 20.6, 38, 2.4, t.ink);
    },
    rfidtag: function () {
      return '<rect x="-52" y="-26" width="70" height="52" rx="8" fill="#fff"/>' +
        '<rect x="-40" y="-12" width="22" height="24" rx="3" fill="' + ACC + '" fill-opacity=".25"/>' +
        '<path d="M-10 -6H8M-10 0H8M-10 6H2"/>' +
        '<path d="M28 -14a20 20 0 0 1 0 28M38 -24a34 34 0 0 1 0 48M48 -34a48 48 0 0 1 0 68"/>';
    },
    rfidreader: function (t) {
      return '<rect x="-32" y="-10" width="64" height="58" rx="8" fill="#fff"/>' +
        '<circle cx="0" cy="18" r="11" fill="' + ACC + '" fill-opacity=".22"/><circle cx="0" cy="18" r="3" fill="' + t.ink + '" stroke="none"/>' +
        '<path d="M-16 -22a22 22 0 0 1 32 0M-28 -34a40 40 0 0 1 56 0M-40 -46a58 58 0 0 1 80 0"/>' +
        '<circle cx="22" cy="38" r="2.2" fill="' + ACC + '" stroke="none"/>';
    },
    sensor: function () {
      return '<circle r="24" fill="#fff"/><circle r="9" fill="' + ACC + '" fill-opacity=".3"/>' +
        '<path d="M-34 -14a38 38 0 0 0 0 28M-46 -24a54 54 0 0 0 0 48M34 -14a38 38 0 0 1 0 28M46 -24a54 54 0 0 1 0 48"/>' +
        '<path d="M0 24V50M-16 50H16"/>';
    },
    gateway: function (t) {
      return '<rect x="-52" y="8" width="104" height="34" rx="6" fill="#fff"/>' +
        '<circle cx="-36" cy="25" r="3" fill="' + ACC + '" stroke="none"/><circle cx="-24" cy="25" r="3" fill="' + t.ink + '" stroke="none"/><circle cx="-12" cy="25" r="3" fill="' + t.ink + '" stroke="none"/>' +
        '<path d="M12 25H40M-38 8V-30M38 8V-30M-16 -16a22 22 0 0 1 32 0M-8 -6a10 10 0 0 1 16 0"/>' +
        '<circle cx="-38" cy="-34" r="4" fill="' + ACC + '"/><circle cx="38" cy="-34" r="4" fill="' + ACC + '"/><circle cx="0" cy="2" r="2.5" fill="' + t.ink + '" stroke="none"/>';
    },
    integration: function () {
      var n = '';
      [[-52, -40], [30, -40], [-52, 18], [30, 18]].forEach(function (p) { n += '<rect x="' + p[0] + '" y="' + p[1] + '" width="22" height="22" rx="4" fill="#fff"/>'; });
      return '<path d="M-41 -29L-10 -9M41 -29L10 -9M-41 29L-10 9M41 29L10 9"/>' + n +
        '<circle r="15" fill="' + ACC + '" fill-opacity=".25"/><circle r="5" fill="' + ACC + '" stroke="none"/>';
    },
    plc: function (t) {
      var rows = '';
      [-36, -10, 16].forEach(function (y) {
        rows += '<rect x="-46" y="' + y + '" width="92" height="20" rx="3"/>' +
          '<circle cx="-36" cy="' + (y + 10) + '" r="2.4" fill="' + ACC + '" stroke="none"/><circle cx="-27" cy="' + (y + 10) + '" r="2.4" fill="' + t.ink + '" stroke="none"/>' +
          '<path d="M-10 ' + (y + 10) + 'H36"/>';
      });
      return '<rect x="-56" y="-46" width="112" height="92" rx="6" fill="#fff"/>' + rows + '<path d="M-30 46V58M0 46V58M30 46V58"/>';
    },
    amc: function () {
      return '<rect x="-42" y="-42" width="84" height="88" rx="8" fill="#fff"/><path d="M-42 -20H42M-22 -52V-34M22 -52V-34"/>' +
        '<path d="M-20 12L-6 26L22 -4" stroke="' + ACC + '" stroke-width="5"/>';
    },
    gear: function () {
      return '<circle r="38" stroke-width="9" stroke-dasharray="8.5 8.55" stroke-linecap="butt"/>' +
        '<circle r="30" fill="#fff"/><circle r="11" fill="' + ACC + '" fill-opacity=".25"/><circle r="3" fill="' + ACC + '" stroke="none"/>';
    },
    elevator: function () {
      return '<rect x="-34" y="-56" width="68" height="112" rx="6" fill="#fff"/>' +
        '<rect x="-22" y="-14" width="44" height="52" rx="4" fill="' + ACC + '" fill-opacity=".2"/><path d="M0 -14V38M0 -56V-14"/>' +
        '<path d="M46 -22l8 -10l8 10M46 22l8 10l8 -10"/>';
    },
    emergency: function () {
      return '<rect x="-52" y="-24" width="58" height="76" rx="6" fill="#fff"/><path d="M-23 -8V52M-52 -8H6"/>' +
        '<path d="M32 -50L56 -10H8Z" fill="' + ACC + '" fill-opacity=".22" stroke="' + ACC + '"/>' +
        '<path d="M32 -36V-24" stroke="' + ACC + '"/><circle cx="32" cy="-16" r="1.8" fill="' + ACC + '" stroke="none"/>';
    }
  };

  function art(p) {
    var t = THEME[p.cat], id = 'sx' + (++uid);
    return '<svg viewBox="0 0 320 240" class="absolute inset-0 w-full h-full" role="img" aria-label="' + esc(p.title) + ' illustration" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="g' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + t.bg1 + '"/><stop offset="1" stop-color="' + t.bg2 + '"/></linearGradient>' +
      '<pattern id="p' + id + '" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="' + t.line + '" stroke-opacity=".10"/></pattern></defs>' +
      '<rect width="320" height="240" fill="url(#g' + id + ')"/><rect width="320" height="240" fill="url(#p' + id + ')"/>' +
      '<g transform="translate(160 120) scale(1.12)" stroke="' + t.ink + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">' + GLYPH[p.art](t) + '</g></svg>';
  }

  /* ---------- Product card (one component for home, listings, search) ---------- */
  function cardHTML(p) {
    var c = SX.CATS[p.cat];
    var media = p.img
      ? '<img src="' + IMG + p.img + '" alt="' + esc(p.title) + '" loading="lazy" class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out">'
      : art(p);
    return '<article class="group flex flex-col bg-white border border-bd rounded-card overflow-hidden transition-shadow hover:shadow-card">' +
      '<a href="product-detail.html" class="relative block aspect-[4/3] bg-warm1 overflow-hidden" aria-label="' + esc(p.title) + '">' + media +
      (p.isNew ? '<span class="absolute top-3 left-3 bg-red text-white text-[10px] plex uppercase tracking-wide px-2 py-1 rounded-md">New</span>' : '') +
      '<button type="button" aria-label="Add ' + esc(p.title) + ' to wishlist" onclick="event.preventDefault()" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-bd shadow-sm2 flex items-center justify-center hover:border-red"><img src="' + ICON + 'icon-wishlist.svg" alt="" width="16" height="16"></button>' +
      '</a>' +
      '<div class="p-5 flex flex-col flex-1">' +
      '<p class="flex items-center gap-2 text-xs plex text-faint"><span class="w-2 h-2 rounded-full shrink-0" style="background:' + c.color + '"></span>' + esc(c.short) + ' · ' + esc(p.sub) + '</p>' +
      '<h3 class="font-bold text-ink text-sm mt-1.5 leading-snug flex-1"><a href="product-detail.html" class="hover:text-red">' + esc(p.title) + '</a></h3>' +
      '<div class="flex items-center justify-end mt-4"><button type="button" aria-label="Add ' + esc(p.title) + ' to cart" onclick="event.preventDefault()" class="w-8 h-8 rounded-lg bg-[#f0eded] hover:bg-[#e6dfdc] flex items-center justify-center"><img src="' + ICON + 'icon-add-cart-2.svg" alt="" width="15" height="15"></button></div>' +
      '</div></article>';
  }

  /* Default order interleaves categories so the first page always shows a mix. */
  function interleaved(list) {
    var groups = ['industrial', 'iot', 'engineering'].map(function (k) { return list.filter(function (p) { return p.cat === k; }); });
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      groups.forEach(function (g) { if (g[i]) { out.push(g[i]); more = true; } });
      i++;
    }
    return out;
  }

  function search(list, q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return list.map(function (p) { return { p: p, s: 0 }; });
    var out = [];
    list.forEach(function (p) {
      var c = SX.CATS[p.cat];
      var title = p.title.toLowerCase();
      var hay = [p.title, p.sub, c.name, c.short, p.code, p.kw || ''].join(' ').toLowerCase();
      var ok = terms.every(function (t) { return hay.indexOf(t) !== -1; });
      if (!ok) return;
      var s = 0;
      terms.forEach(function (t) { if (title.indexOf(t) !== -1) s += 2; if (p.code.toLowerCase() === t) s += 4; });
      out.push({ p: p, s: s });
    });
    return out;
  }

  /* ---------- Listing pages ---------- */
  function initListing(scope) {
    var grid = $('#product-grid');
    if (!grid) return;
    var P = params();
    var q = (P.get('q') || '').trim();
    var sub = P.get('sub') || '';
    var chip = P.get('cat') || '';           // category filter on the "all products" / search page
    var sort = P.get('sort') || 'relevance';
    var page = Math.max(1, parseInt(P.get('page') || '1', 10) || 1);
    var base = location.pathname.split('/').pop() || 'products.html';

    var pool = scope === 'all' ? SX.PRODUCTS : SX.PRODUCTS.filter(function (p) { return p.cat === scope; });
    var hits = search(pool, q);
    var counts = { industrial: 0, iot: 0, engineering: 0 };
    hits.forEach(function (h) { counts[h.p.cat]++; });

    var shown = hits;
    if (scope === 'all' && chip && SX.CATS[chip]) shown = shown.filter(function (h) { return h.p.cat === chip; });
    if (scope !== 'all' && sub) shown = shown.filter(function (h) { return h.p.sub === sub; });

    if (sort === 'az') shown = shown.slice().sort(function (a, b) { return a.p.title.localeCompare(b.p.title); });
    else if (sort === 'new') shown = shown.slice().sort(function (a, b) { return (b.p.isNew ? 1 : 0) - (a.p.isNew ? 1 : 0); });
    else if (q) shown = shown.slice().sort(function (a, b) { return b.s - a.s; });
    else if (scope === 'all') shown = interleaved(shown.map(function (h) { return h.p; })).map(function (p) { return { p: p }; });

    var total = shown.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    page = Math.min(page, pages);
    var slice = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    // Heading, breadcrumb, count (textContent: no HTML is ever built from the search words here)
    var h1 = $('#listing-title'), sub1 = $('#listing-sub'), crumb = $('#crumb-current'), count = $('#listing-count');
    if (scope === 'all' && q) {
      var cats = Object.keys(counts).filter(function (k) { return counts[k]; }).length;
      h1.textContent = 'Search results for “' + q + '”';
      sub1.textContent = hits.length ? hits.length + ' item' + (hits.length === 1 ? '' : 's') + ' found across ' + cats + ' categor' + (cats === 1 ? 'y' : 'ies') + '.' : 'No items matched your search.';
      crumb.textContent = 'Search results';
      document.title = 'Search: ' + q + ' — Sysidex';
    }
    if (count) count.textContent = total + ' item' + (total === 1 ? '' : 's');
    var input = $('input[type="search"][name="q"]');
    if (input && q) input.value = q;

    // Filter chips
    var chipsEl = $('#listing-chips');
    if (chipsEl) {
      var chipCls = 'inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm plex transition-colors ';
      var on = 'bg-blue text-white border-blue', off = 'bg-white text-ink border-bd hover:border-blue hover:text-blue';
      var html = '';
      if (scope === 'all') {
        html += '<a href="' + esc(href(base, { q: q, sort: sort === 'relevance' ? '' : sort })) + '" class="' + chipCls + (!chip ? on : off) + '">All <span class="text-xs opacity-80">' + hits.length + '</span></a>';
        Object.keys(SX.CATS).forEach(function (k) {
          var c = SX.CATS[k];
          html += '<a href="' + esc(href(base, { q: q, cat: k, sort: sort === 'relevance' ? '' : sort })) + '" class="' + chipCls + (chip === k ? on : off) + '">' +
            '<span class="w-2 h-2 rounded-full" style="background:' + c.color + '"></span>' + esc(c.short) + ' <span class="text-xs opacity-80">' + counts[k] + '</span></a>';
        });
      } else {
        var subs = [];
        pool.forEach(function (p) { if (subs.indexOf(p.sub) === -1) subs.push(p.sub); });
        html += '<a href="' + esc(base) + '" class="' + chipCls + (!sub ? on : off) + '">All <span class="text-xs opacity-80">' + pool.length + '</span></a>';
        subs.forEach(function (s) {
          var n = pool.filter(function (p) { return p.sub === s; }).length;
          html += '<a href="' + esc(href(base, { sub: s })) + '" class="' + chipCls + (sub === s ? on : off) + '">' + esc(s) + ' <span class="text-xs opacity-80">' + n + '</span></a>';
        });
      }
      setHTML(chipsEl, html);
    }

    // Sort control
    var sel = $('#listing-sort');
    if (sel) {
      sel.value = sort;
      sel.addEventListener('change', function () {
        var np = {}; P.forEach(function (v, k) { np[k] = v; });
        np.sort = sel.value === 'relevance' ? '' : sel.value; delete np.page;
        location.href = href(base, np);
      });
    }

    // Grid or empty state
    if (!slice.length) {
      grid.className = '';
      setHTML(grid, '<div class="rounded-card border border-bd bg-warm3 p-10 text-center">' +
        '<p class="text-lg font-bold text-ink">No items found' + (q ? ' for “' + esc(q) + '”' : '') + '</p>' +
        '<p class="text-body mt-2">Try a different word, a product code such as <span class="font-semibold">IOT-001</span>, or browse a category.</p>' +
        '<div class="flex flex-wrap justify-center gap-3 mt-6">' +
        Object.keys(SX.CATS).map(function (k) { return '<a href="' + SX.CATS[k].page + '" class="inline-flex items-center h-10 px-4 rounded-full border border-bd bg-white text-sm plex hover:border-blue hover:text-blue"><span class="w-2 h-2 rounded-full mr-2" style="background:' + SX.CATS[k].color + '"></span>' + esc(SX.CATS[k].name) + '</a>'; }).join('') +
        '</div></div>');
    } else {
      setHTML(grid, slice.map(function (h) { return cardHTML(h.p); }).join(''));
    }

    // Pagination
    var pager = $('#listing-pager');
    if (pager) {
      if (pages <= 1) { setHTML(pager, ''); return; }
      var np2 = {}; P.forEach(function (v, k) { np2[k] = v; });
      var link = function (n, label, cls, cur) { np2.page = n === 1 ? '' : n; return '<a href="' + esc(href(base, np2)) + '" class="' + cls + '"' + (cur ? ' aria-current="page"' : '') + '>' + label + '</a>'; };
      var box = 'w-10 h-10 inline-flex items-center justify-center rounded-lg border text-sm plex ';
      var out = '';
      if (page > 1) out += link(page - 1, 'Prev', 'h-10 px-4 inline-flex items-center rounded-lg border border-bd text-sm plex hover:bg-warm3');
      for (var n = 1; n <= pages; n++) out += link(n, n, box + (n === page ? 'bg-blue text-white border-blue font-semibold' : 'border-bd hover:bg-warm3'), n === page);
      if (page < pages) out += link(page + 1, 'Next', 'h-10 px-4 inline-flex items-center rounded-lg border border-bd text-sm plex hover:bg-warm3');
      setHTML(pager, out);
    }
  }

  /* ---------- Home: latest products ---------- */
  function initLatest() {
    var el = $('[data-latest]');
    if (!el) return;
    setHTML(el, SX.PRODUCTS.filter(function (p) { return p.latest; }).slice(0, 4).map(cardHTML).join(''));
  }

  /* ---------- Logos: marquee + full list ---------- */
  var TILE = 'sx-logo shrink-0 flex items-center justify-center bg-white border border-bd rounded-card';
  function logoImg(l, cls) { return '<img src="' + IMG + l.file + '" alt="' + esc(l.name) + '" loading="lazy" class="' + cls + ' object-contain">'; }

  function initMarquee(el) {
    var kind = el.getAttribute('data-logos');
    var limit = parseInt(el.getAttribute('data-limit') || '8', 10);
    var list = (SX.LOGOS[kind] || []).slice(0, limit);
    if (!list.length) return;
    var tileW = 176, gap = 16;                       // w-44 tiles + 1rem gap
    var groupW = list.length * (tileW + gap);
    var k = Math.max(2, Math.ceil((Math.max(el.offsetWidth, window.innerWidth) * 2) / groupW));
    var group = function (hidden) {
      return '<ul class="sx-marquee-group"' + (hidden ? ' aria-hidden="true"' : '') + '>' + list.map(function (l) {
        return '<li class="' + TILE + ' w-44 h-24 p-4">' + logoImg(l, 'max-h-14 max-w-full') + '</li>';
      }).join('') + '</ul>';
    };
    var groups = '';
    for (var i = 0; i < k; i++) groups += group(i > 0);
    el.classList.add('sx-marquee');
    setHTML(el, '<div class="sx-marquee-track" style="--k:' + k + ';--dur:' + Math.max(24, list.length * 6) + 's">' + groups + '</div>');
  }

  function initPause() {
    document.querySelectorAll('[data-marquee-pause]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = btn.closest('section').querySelector('.sx-marquee');
        var paused = m.classList.toggle('is-paused');
        btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        btn.textContent = paused ? 'Play animation' : 'Pause animation';
      });
    });
  }

  function initLogoGrid(el) {
    var kind = el.getAttribute('data-logo-grid');
    var list = SX.LOGOS[kind] || [];
    var input = $('#logo-filter');
    var countEl = $('#logo-count');
    function draw() {
      var q = input ? input.value.trim().toLowerCase() : '';
      var shown = list.filter(function (l) { return !q || l.name.toLowerCase().indexOf(q) !== -1; });
      if (countEl) countEl.textContent = shown.length + (shown.length === 1 ? ' company' : ' companies');
      setHTML(el, shown.length ? shown.map(function (l) {
        return '<li class="' + TILE + ' flex-col gap-4 p-6 min-h-[11rem]">' + logoImg(l, 'h-16 max-w-full') +
          '<span class="text-xs plex text-faint text-center leading-snug">' + esc(l.name) + '</span></li>';
      }).join('') : '<li class="col-span-full rounded-card border border-bd bg-warm3 p-10 text-center text-body">No companies match this search.</li>');
    }
    if (input) input.addEventListener('input', draw);
    draw();
  }

  function boot() {
    var scope = document.body.getAttribute('data-scope');
    if (scope) initListing(scope);
    initLatest();
    document.querySelectorAll('[data-logos]').forEach(initMarquee);
    document.querySelectorAll('[data-logo-grid]').forEach(initLogoGrid);
    initPause();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
