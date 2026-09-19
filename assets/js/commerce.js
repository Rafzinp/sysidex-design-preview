/*
  Sysidex prototype commerce layer: cart + sales inquiry, one interaction model for every page.

  Journeys
    The cart is a QUOTE LIST (no prices), the same model bushtorm.com uses: items + quantities are sent to
    the sales team, who reply with availability and pricing.
    Add to Cart     card / detail button -> cart panel opens at once with an "Added" banner (or "Quantity
                    updated" if the item was already there) -> change quantity / remove + undo
                    -> Proceed to Checkout -> enquiry form (order summary) -> status with reference ID
    Sales Inquiry   detail button / "Request Quote" -> enquiry form (product context) -> status

  Figma: cart drawer 1455:5952, request form 1455:6186, status 1455:6401 (file Osy2khiKqnrxdLGTmWNBEP).
  This is a static prototype: nothing is sent anywhere. fakeSend() simulates the network call.
  All dynamic text goes through esc() before it is put in the page.
*/
(function () {
  var SX = window.SX;
  if (!SX) return;

  var ICON = '../assets/icons/';
  var MAX = SX.SHOP.maxQty;
  var K_CART = 'sx_cart_v1', K_WISH = 'sx_wish_v1', K_SEQ = 'sx_req_seq', K_DRAFT = 'sx_draft_v1';

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function setHTML(el, html) { el.innerHTML = html; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function byId(id) { return SX.PRODUCTS.filter(function (p) { return p.id === id; })[0]; }

  function safeStore(kind) {
    try { var s = window[kind]; s.setItem('__t', '1'); s.removeItem('__t'); return s; }
    catch (e) { var m = {}; return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); } }; }
  }
  var LS = safeStore('localStorage'), SS = safeStore('sessionStorage');
  function read(store, key, fallback) { try { var v = store.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function write(store, key, value) { try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full: keep working in memory */ } }

  /* ---------- cart state ---------- */
  var cart = read(LS, K_CART, []).filter(function (l) { return byId(l.id) && l.qty > 0; });

  function saveCart() { write(LS, K_CART, cart); refreshHeader(true); }
  function count() { return cart.reduce(function (n, l) { return n + l.qty; }, 0); }
  function line(id) { return cart.filter(function (l) { return l.id === id; })[0]; }

  /** Returns 'added' | 'updated' | 'max' | 'none'. */
  function add(id, qty) {
    var p = byId(id);
    if (!p) return 'none';
    qty = qty || 1;
    var l = line(id);
    if (!l) { cart.push({ id: id, qty: Math.min(qty, MAX) }); saveCart(); return 'added'; }
    if (l.qty >= MAX) return 'max';
    l.qty = Math.min(MAX, l.qty + qty);
    saveCart();
    return 'updated';
  }
  function setQty(id, qty) {
    var l = line(id);
    if (!l) return;
    l.qty = Math.max(1, Math.min(MAX, qty));
    saveCart();
  }
  var lastRemoved = null;
  function remove(id) {
    var i = cart.map(function (l) { return l.id; }).indexOf(id);
    if (i < 0) return;
    lastRemoved = { line: cart[i], index: i };
    cart.splice(i, 1);
    saveCart();
  }
  function undoRemove() {
    if (!lastRemoved) return;
    cart.splice(Math.min(lastRemoved.index, cart.length), 0, lastRemoved.line);
    lastRemoved = null;
    saveCart();
  }
  function clearCart() { cart = []; lastRemoved = null; saveCart(); }

  /* ---------- header cart button ---------- */
  function refreshHeader(bump) {
    var n = count();
    $$('[data-sx-cart-label]').forEach(function (el) { el.textContent = n + (n === 1 ? ' Item' : ' Items'); });
    $$('[data-sx-cart]').forEach(function (b) {
      b.setAttribute('aria-label', 'Open cart, ' + n + (n === 1 ? ' item' : ' items'));
    });
    $$('[data-sx-cart-badge]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('hidden', n === 0);
      el.classList.remove('sx-bump');
      if (bump && n) { void el.offsetWidth; el.classList.add('sx-bump'); }
    });
  }

  /* ---------- root: scrim + drawer + toasts + live region ---------- */
  var region, live;
  function ensureRoot() {
    if ($('#sx-root')) return;
    var root = document.createElement('div');
    root.id = 'sx-root';
    setHTML(root,
      '<div class="sx-scrim" id="sx-scrim"></div>' +
      '<aside class="sx-drawer" id="sx-drawer" role="dialog" aria-modal="true" aria-labelledby="sx-title" tabindex="-1"></aside>' +
      '<div class="sx-toast-region" id="sx-toast-region" role="region" aria-label="Notifications"></div>' +
      '<p id="sx-live" class="sr-only" aria-live="polite" aria-atomic="true"></p>');
    document.body.appendChild(root);
    region = $('#sx-toast-region', root);
    live = $('#sx-live', root);
    $('#sx-scrim', root).addEventListener('click', closeDrawer);
    $('#sx-drawer', root).addEventListener('keydown', trapKeys);
  }
  function announce(msg) { ensureRoot(); live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

  /* ---------- toast (confirmation feedback) ---------- */
  function toast(opts) {
    ensureRoot();
    var tone = opts.tone || 'ok';
    var el = document.createElement('div');
    el.className = 'sx-toast flex items-start gap-3 bg-[#1b2a4a] text-white rounded-card shadow-card px-4 py-3 text-sm';
    el.setAttribute('role', tone === 'ok' ? 'status' : 'alert');
    var icon = tone === 'ok'
      ? '<span class="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-[#10b981] flex items-center justify-center text-[11px] font-bold" aria-hidden="true">✓</span>'
      : '<span class="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-orange flex items-center justify-center text-[11px] font-bold" aria-hidden="true">!</span>';
    setHTML(el, icon + '<div class="flex-1 min-w-0"><p class="font-bold leading-snug">' + esc(opts.title) + '</p>' +
      (opts.detail ? '<p class="text-white/80 text-xs mt-0.5 leading-snug">' + esc(opts.detail) + '</p>' : '') + '</div>' +
      (opts.action ? '<button type="button" class="shrink-0 font-bold underline underline-offset-2 hover:text-orange" data-toast-action>' + esc(opts.action) + '</button>' : '') +
      '<button type="button" class="shrink-0 -mr-1 w-6 h-6 rounded-full hover:bg-white/15 text-xs" aria-label="Dismiss notification" data-toast-close>✕</button>');
    var timer;
    function dismiss() { clearTimeout(timer); el.remove(); }
    function arm() { clearTimeout(timer); timer = setTimeout(dismiss, opts.action ? 6500 : 4000); }
    $('[data-toast-close]', el).addEventListener('click', dismiss);
    if (opts.action) $('[data-toast-action]', el).addEventListener('click', function () { dismiss(); if (opts.onAction) opts.onAction(); });
    el.addEventListener('mouseenter', function () { clearTimeout(timer); });
    el.addEventListener('mouseleave', arm);
    el.addEventListener('focusin', function () { clearTimeout(timer); });
    el.addEventListener('focusout', arm);
    while (region.children.length >= 3) region.firstChild.remove();
    region.appendChild(el);
    region.classList.toggle('is-left', drawerOpen);
    arm();
  }

  /* ---------- drawer shell ---------- */
  var drawerOpen = false, opener = null, view = 'cart', ctx = {};

  function thumb(p, size) {
    var inner = p.img
      ? '<img src="../assets/images/' + p.img + '" alt="" class="absolute inset-0 w-full h-full object-cover">'
      : (SX.ui ? SX.ui.art(p) : '');
    return '<div class="relative shrink-0 overflow-hidden bg-warm1 rounded-md" style="width:' + size + 'px;height:' + size + 'px">' + inner + '</div>';
  }
  function header(inner) {
    return '<div class="flex items-center justify-between px-8 pt-6 pb-5 border-b border-[#e0e0e0] shrink-0">' + inner +
      '<button type="button" data-sx-close aria-label="Close" class="w-8 h-8 rounded-full bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[14px] font-bold text-[#1c1b1b] flex items-center justify-center">✕</button></div>';
  }
  var CTA = 'flex items-center justify-center gap-2 h-[54px] w-full px-8 bg-[#bb0017] hover:bg-[#970012] text-white text-[14px] plex font-bold uppercase tracking-[0.7px] transition-colors disabled:opacity-70 disabled:cursor-not-allowed';
  var ARROW = '<img src="' + ICON + 'icon-quote-btn.svg" alt="" width="16" height="16">';
  var STEP = 'sx-step w-7 h-7 rounded-full border-[1.5px] border-[#bdbdbd] hover:border-[#1b2a4a] text-[16px] leading-none text-[#1c1b1b] flex items-center justify-center transition-colors';

  function shell(html) { setHTML($('#sx-drawer'), html); }
  function focusTitle() { var t = $('#sx-title'); if (t) t.focus({ preventScroll: true }); }

  function openDrawer(v, c) {
    ensureRoot();
    view = v; ctx = c || {};
    if (!drawerOpen) {
      opener = opener || document.activeElement;
      drawerOpen = true;
      document.documentElement.classList.add('sx-lock');
      $$('body > *').forEach(function (el) { if (el.id !== 'sx-root' && el.tagName !== 'SCRIPT') el.inert = true; });
      $('#sx-scrim').classList.add('is-open');
      $('#sx-drawer').classList.add('is-open');
      region.classList.add('is-left');
    }
    render();
    focusTitle();
  }

  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    $('#sx-scrim').classList.remove('is-open');
    $('#sx-drawer').classList.remove('is-open');
    region.classList.remove('is-left');
    document.documentElement.classList.remove('sx-lock');
    $$('body > *').forEach(function (el) { el.inert = false; });
    var back = opener && document.contains(opener) ? opener : $('[data-sx-cart]');
    opener = null;
    if (back && back.focus) back.focus();
    if (location.hash === '#cart') history.replaceState(null, '', location.pathname + location.search);
  }

  function trapKeys(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])', $('#sx-drawer'))
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === first || a === $('#sx-drawer') || a === $('#sx-title'))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }

  function render() {
    if (view === 'cart') renderCart();
    else if (view === 'inquiry') renderInquiry();
    else renderStatus();
  }

  /* ---------- view 1: cart (Figma 1455:5952; quote list, no prices) ---------- */
  function bannerHTML() {
    var a = ctx.added;
    if (!a) return '';
    var p = byId(a.id), l = line(a.id);
    var msg = a.res === 'added' ? 'Added to cart' : a.res === 'updated' ? 'Quantity updated to ' + (l ? l.qty : '') : 'Maximum ' + MAX + ' per order. For larger volumes, send a Sales Inquiry.';
    var ok = a.res !== 'max';
    return '<div id="sx-banner" role="status" class="mx-8 mt-5 flex items-start gap-2 rounded-lg px-4 py-3 text-[13px] ' + (ok ? 'bg-[#e6f4ea] text-[#0d6d4a]' : 'bg-[#fff4e5] text-[#9a4a00]') + '">' +
      '<span aria-hidden="true" class="font-bold">' + (ok ? '✓' : '!') + '</span><span><strong>' + esc(msg) + '</strong>' + (ok ? '<br><span class="font-normal">' + esc(p.title) + '</span>' : '') + '</span></div>';
  }

  function renderCart() {
    var n = count();
    var head = header('<div class="flex items-center gap-[10px]"><h2 id="sx-title" tabindex="-1" class="text-[18px] font-extrabold text-[#1b2a4a] outline-none">Cart</h2>' +
      '<span class="min-w-[22px] h-[22px] px-1 rounded-full bg-[#1b2a4a] text-white text-[11px] font-bold flex items-center justify-center" aria-label="' + n + (n === 1 ? ' item' : ' items') + '">' + n + '</span></div>');

    if (!cart.length) {                                                       // empty state
      shell(head +
        '<div class="sx-body flex flex-col items-center justify-center text-center px-8 gap-5">' +
        '<div class="w-16 h-16 rounded-full bg-[#f3f4f6] flex items-center justify-center"><img src="' + ICON + 'icon-cart.svg" alt="" width="24" height="22"></div>' +
        '<div><p class="text-[18px] font-extrabold text-[#1b2a4a]">Your cart is empty</p>' +
        '<p class="text-[14px] leading-[22px] text-[#6b7280] mt-2 max-w-[320px]">Add products to your cart to request a quotation, or send a Sales Inquiry about a single item.</p></div>' +
        '<button type="button" data-sx-inquire-open class="text-[13px] font-bold text-[#1b2a4a] underline underline-offset-2 hover:text-[#bb0017]">Send a Sales Inquiry instead</button></div>' +
        '<div class="border-t border-[#e0e0e0] px-8 pt-5 pb-6 shrink-0"><a href="products.html" data-sx-continue class="' + CTA + '">Browse Products ' + ARROW + '</a></div>');
      return;
    }

    var items = cart.map(function (l) {
      var p = byId(l.id);
      var fresh = ctx.added && ctx.added.id === l.id && ctx.added.res !== 'max';
      return '<li class="flex items-center gap-4 px-8 py-5 border-b border-[#e0e0e0]' + (fresh ? ' bg-[#f7f8fa]' : '') + '" data-line="' + esc(l.id) + '">' + thumb(p, 72) +
        '<div class="flex-1 min-w-0 flex flex-col gap-1">' +
        '<p class="text-[11px] font-bold uppercase text-[#6b7280]">' + esc(p.sub) + '</p>' +
        '<a href="product-detail.html?id=' + esc(p.id) + '" class="text-[13px] leading-[18px] font-bold text-[#1b2a4a] hover:text-[#bb0017]">' + esc(p.title) + '</a>' +
        '<div class="flex items-center justify-between gap-3 mt-1">' +
        '<div class="flex items-center gap-3" role="group" aria-label="Quantity for ' + esc(p.title) + '">' +
        '<button type="button" class="' + STEP + '" data-dec="' + esc(l.id) + '" aria-label="Decrease quantity"' + (l.qty <= 1 ? ' disabled' : '') + '>−</button>' +
        '<span class="min-w-[20px] text-center text-[15px] font-bold text-[#1c1b1b]">' + l.qty + '</span>' +
        '<button type="button" class="' + STEP + '" data-inc="' + esc(l.id) + '" aria-label="Increase quantity"' + (l.qty >= MAX ? ' disabled title="Maximum ' + MAX + ' per order"' : '') + '>+</button></div>' +
        '<button type="button" class="text-[12px] text-[#6b7280] underline underline-offset-2 hover:text-[#bb0017]" data-remove="' + esc(l.id) + '" aria-label="Remove ' + esc(p.title) + ' from cart">Remove</button></div>' +
        '</div></li>';
    }).join('');

    var hitMax = cart.some(function (l) { return l.qty >= MAX; });
    shell(head +
      '<div class="sx-body">' + bannerHTML() + '<ul>' + items + '</ul>' +
      (hitMax ? '<p class="px-8 py-4 text-[12px] text-[#6b7280]">Need more than ' + MAX + ' of one item? <button type="button" data-sx-inquire-open class="font-bold text-[#1b2a4a] underline underline-offset-2">Ask for a bulk quote</button>.</p>' : '') + '</div>' +
      '<div class="border-t border-[#e0e0e0] px-8 pt-5 pb-6 flex flex-col gap-4 shrink-0">' +
      '<div class="flex items-baseline justify-between"><span class="text-[13px] font-bold text-[#1c1b1b]">Total items</span><span class="text-[18px] font-extrabold text-[#1b2a4a]">' + n + '</span></div>' +
      '<p class="text-[12px] leading-[18px] text-[#6b7280] -mt-2">No payment is taken online. Send your list and our team replies with availability, delivery and pricing.</p>' +
      '<button type="button" data-sx-checkout class="' + CTA + '">Proceed to Checkout ' + ARROW + '</button>' +
      '<p class="text-center text-[12px] text-[#6b7280]">or <button type="button" data-sx-continue class="font-bold text-[#1b2a4a] underline underline-offset-2 hover:text-[#bb0017]">Continue Shopping</button></p></div>');

    var banner = $('#sx-banner');
    if (banner) setTimeout(function () { if (banner.isConnected) banner.remove(); }, 6000);
    var fresh = ctx.added && $('[data-line="' + ctx.added.id + '"]', $('#sx-drawer'));
    if (fresh) fresh.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- view 2: request form (Figma 1455:6186) ---------- */
  var FIELDS = [
    { name: 'name', label: 'Full Name', required: true, type: 'text', ph: 'e.g. John Doe', auto: 'name' },
    { name: 'email', label: 'Email Address', required: true, type: 'email', ph: 'e.g. john@company.com', auto: 'email' },
    { name: 'phone', label: 'Phone Number', required: true, type: 'tel', ph: 'e.g. +974 5555 1234', auto: 'tel' },
    { name: 'company', label: 'Company Name', required: true, type: 'text', ph: 'e.g. Sysidex Contracting WLL', auto: 'organization' },
    { name: 'city', label: 'City', required: false, type: 'text', ph: 'e.g. Doha', auto: 'address-level2', half: true },
    { name: 'country', label: 'Country', required: false, type: 'text', ph: 'e.g. Qatar', auto: 'country-name', half: true },
    { name: 'message', label: 'Message / Technical Notes', required: false, type: 'textarea', ph: 'Specify quantity, destination, or required customized specifications...' }
  ];
  var INPUT = 'w-full px-3 border border-[#e0e0e0] rounded-lg bg-white text-[14px] text-[#1c1b1b] placeholder:text-[#6b7280] focus:outline-none focus:border-[#2b3990]';

  function backLabel() { return { details: 'Back to Details', listing: 'Back to Products', cart: 'Back to Cart' }[ctx.from] || 'Back'; }

  function contextBlock() {
    if (ctx.from === 'cart') {
      var rows = cart.map(function (l) {
        return '<li class="flex justify-between gap-3 text-[13px]"><span class="min-w-0">' + esc(byId(l.id).title) + '</span><span class="shrink-0 font-bold text-[#1b2a4a]">×' + l.qty + '</span></li>';
      }).join('');
      return '<div class="rounded-lg border border-[#e0e0e0] bg-[#f7f8fa] p-4"><p class="text-[11px] font-bold uppercase text-[#6b7280] mb-2">Your list (' + count() + (count() === 1 ? ' item' : ' items') + ')</p><ul class="space-y-1.5">' + rows + '</ul>' +
        '</div>';
    }
    var p = ctx.productId && byId(ctx.productId);
    if (!p) return '';
    return '<div class="flex items-center gap-3 rounded-lg border border-[#e0e0e0] bg-[#f7f8fa] p-3">' + thumb(p, 56) +
      '<div class="min-w-0"><p class="text-[11px] font-bold uppercase text-[#6b7280]">Inquiry about</p><p class="text-[13px] leading-[18px] font-bold text-[#1b2a4a]">' + esc(p.title) + '</p>' +
      '<p class="text-[12px] text-[#6b7280]">' + esc(p.code) + '</p></div></div>';
  }

  function renderInquiry(errors, banner, busy) {
    errors = errors || {};
    var draft = read(SS, K_DRAFT, {});
    var errCount = Object.keys(errors).length;
    var fields = FIELDS.map(function (f) {
      var id = 'sx-f-' + f.name, err = errors[f.name], val = draft[f.name] || '';
      var common = 'id="' + id + '" name="' + f.name + '" autocomplete="' + (f.auto || 'off') + '"' + (f.required ? ' required aria-required="true"' : '') +
        (err ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : '') + (busy ? ' disabled' : '');
      var control = f.type === 'textarea'
        ? '<textarea ' + common + ' rows="4" placeholder="' + esc(f.ph) + '" class="' + INPUT + ' py-3 min-h-[100px] resize-y' + (err ? ' sx-field-error' : '') + '">' + esc(val) + '</textarea>'
        : '<input ' + common + ' type="' + f.type + '" value="' + esc(val) + '" placeholder="' + esc(f.ph) + '" class="' + INPUT + ' h-[42px]' + (err ? ' sx-field-error' : '') + '">';
      return '<div class="flex flex-col gap-[6px]' + (f.half ? '' : ' col-span-2') + '"><label for="' + id + '" class="text-[13px] font-bold text-[#1c1b1b]">' + esc(f.label) + (f.required ? ' *' : '') + '</label>' + control +
        (err ? '<p id="' + id + '-err" class="text-[12px] text-[#bb0017]">' + esc(err) + '</p>' : '') + '</div>';
    }).join('');

    var sub = ctx.from === 'cart' ? 'Confirm your company details and we will send a wholesale price quotation for your list.' : 'Provide your company details below to request a wholesale price quotation.';
    shell(header('<button type="button" data-sx-back class="flex items-center gap-2 text-[14px] font-bold text-[#6b7280] hover:text-[#1b2a4a]"><span aria-hidden="true">←</span> ' + esc(backLabel()) + '</button>') +
      '<form id="sx-form" novalidate class="flex flex-col flex-1 min-h-0">' +
      '<div class="sx-body p-8 flex flex-col gap-6">' +
      '<div class="flex flex-col gap-[6px]"><h2 id="sx-title" tabindex="-1" class="text-[22px] font-extrabold text-[#1b2a4a] outline-none">Submit Your Request</h2><p class="text-[14px] text-[#6b7280]">' + sub + '</p></div>' +
      contextBlock() +
      (errCount ? '<div role="alert" class="rounded-lg border border-[#bb0017]/30 bg-[#bb0017]/5 px-4 py-3 text-[13px] text-[#bb0017]">Please fix ' + errCount + (errCount === 1 ? ' field' : ' fields') + ' below.</div>' : '') +
      (banner ? '<div role="alert" class="rounded-lg border border-[#bb0017]/30 bg-[#bb0017]/5 px-4 py-3 text-[13px] text-[#bb0017]">' + esc(banner) + '</div>' : '') +
      '<div class="grid grid-cols-2 gap-4">' + fields + '</div>' +
      '<p class="text-[12px] leading-[18px] text-[#6b7280]">We only use these details to respond to your request.</p></div>' +
      '<div class="border-t border-[#e0e0e0] p-6 shrink-0"><button type="submit" class="' + CTA + '"' + (busy ? ' disabled aria-busy="true"' : '') + '>' +
      (busy ? '<span class="sx-spin" aria-hidden="true"></span> Submitting…' : 'Submit Request ' + ARROW) + '</button></div></form>');

    var form = $('#sx-form');
    form.addEventListener('input', function (e) {
      var d = read(SS, K_DRAFT, {});
      d[e.target.name] = e.target.value;
      write(SS, K_DRAFT, d);
      if (e.target.classList.contains('sx-field-error') && e.target.value.trim()) {
        e.target.classList.remove('sx-field-error');
        e.target.removeAttribute('aria-invalid');
        var er = $('#' + e.target.id + '-err'); if (er) er.remove();
      }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); submitForm(form); });
  }

  function validate(v) {
    var e = {};
    if (!v.name.trim()) e.name = 'Please enter your full name.';
    if (!v.email.trim()) e.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Enter a valid email, like john@company.com.';
    if (!v.phone.trim()) e.phone = 'Please enter a phone number.';
    else if (v.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number with at least 7 digits.';
    if (!v.company.trim()) e.company = 'Please enter your company name.';
    return e;
  }

  function submitForm(form) {
    var v = {};
    FIELDS.forEach(function (f) { v[f.name] = form.elements[f.name].value; });
    write(SS, K_DRAFT, v);                              // keep what was typed (also covers browser autofill)
    var errors = validate(v);
    if (Object.keys(errors).length) {
      renderInquiry(errors);
      var first = $('[aria-invalid="true"]', $('#sx-drawer'));
      if (first) first.focus();
      return;
    }
    renderInquiry({}, '', true);                        // loading state
    fakeSend().then(function (ref) {
      ctx.reference = ref;
      ctx.summary = summary();
      write(SS, K_DRAFT, {});
      if (ctx.from === 'cart') clearCart();
      view = 'status';
      render();
      focusTitle();
    }, function (msg) {
      renderInquiry({}, msg, false);                    // error state, values kept
      focusTitle();
    });
  }

  function summary() {
    if (ctx.from === 'cart') return count() + (count() === 1 ? ' item' : ' items') + ' sent for quotation';
    var p = ctx.productId && byId(ctx.productId);
    return p ? p.title : 'General sales inquiry';
  }

  /** Prototype only: pretend to post the request. Replace with a real endpoint. */
  function fakeSend() {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        if (navigator.onLine === false) { reject('You appear to be offline. Check your connection and try again. Your details are saved.'); return; }
        var seq = read(LS, K_SEQ, 9040) + 1;
        write(LS, K_SEQ, seq);
        resolve('REQ-' + new Date().getFullYear() + '-' + seq);
      }, 900);
    });
  }

  /* ---------- view 3: status (Figma 1455:6401) ---------- */
  function renderStatus() {
    shell(header('<h2 id="sx-title" tabindex="-1" class="text-[18px] font-extrabold text-[#1b2a4a] outline-none">Status</h2>') +
      '<div class="sx-body flex flex-col items-center justify-center gap-8 p-8 text-center" role="status">' +
      '<div class="w-16 h-16 rounded-full bg-[#e6f4ea] flex items-center justify-center"><img src="' + ICON + 'icon-check-green.svg" alt="" width="32" height="32"></div>' +
      '<div class="flex flex-col gap-3 items-center"><p class="text-[22px] font-extrabold text-[#1b2a4a]">Request Submitted!</p>' +
      '<p class="text-[14px] leading-[22px] text-[#6b7280] max-w-[340px]">Your request has been successfully received. Our engineering procurement team will contact you shortly to assist with the next steps.</p></div>' +
      '<div class="flex flex-col items-center gap-2"><div class="flex items-center gap-3 rounded-md bg-[#f3f4f6] px-4 py-3 text-[13px] text-[#6b7280]">' +
      '<span>Reference ID: <strong class="text-[#1c1b1b]">' + esc(ctx.reference) + '</strong></span>' +
      '<button type="button" data-sx-copy class="text-[12px] font-bold text-[#1b2a4a] underline underline-offset-2 hover:text-[#bb0017]">Copy</button></div>' +
      '<p class="text-[12px] text-[#6b7280]">' + esc(ctx.summary || '') + '</p></div></div>' +
      '<div class="border-t border-[#e0e0e0] p-6 shrink-0"><button type="button" data-sx-close class="' + CTA + '">Close</button></div>');
  }

  /* ---------- page buttons (cards + detail) ---------- */
  function flashButton(btn, label) {
    if (!btn || btn._flashing) return;
    btn._flashing = true;
    var old = btn.innerHTML, oldCls = btn.className;
    btn.classList.add('sx-btn-added');
    setHTML(btn, '<img src="' + ICON + 'icon-check-green.svg" alt="" width="16" height="16">' + (label ? '<span class="ml-1.5 text-[#0d6d4a]">' + esc(label) + '</span>' : ''));
    setTimeout(function () { btn.className = oldCls; setHTML(btn, old); btn._flashing = false; }, 1600);
  }

  function addToCart(id, qty, btn, flashLabel) {
    var p = byId(id);
    if (!p) return;
    var res = add(id, qty);                       // 'added' | 'updated' | 'max'
    if (res !== 'max') flashButton(btn, flashLabel);
    opener = btn;
    openDrawer('cart', { added: { id: id, res: res } });
    announce(res === 'added' ? p.title + ' added to cart' : res === 'updated' ? 'Quantity updated to ' + line(id).qty : 'Maximum ' + MAX + ' per order');
  }

  function onDetail() { return !!$('#pd-actions'); }

  document.addEventListener('click', function (e) {
    var t = e.target, btn;
    if (drawerOpen && $('#sx-drawer').contains(t)) { drawerClick(t, e); return; }
    if ((btn = t.closest('[data-sx-add]'))) {
      e.preventDefault();
      var q = $('#pd-qty');
      addToCart(btn.getAttribute('data-sx-add'), q ? parseInt(q.textContent, 10) || 1 : 1, btn, btn.hasAttribute('data-flash') ? 'Added' : '');
    } else if ((btn = t.closest('[data-sx-inquire]'))) {
      e.preventDefault(); opener = btn;
      openDrawer('inquiry', { from: btn.getAttribute('data-sx-from') || (onDetail() ? 'details' : 'listing'), productId: btn.getAttribute('data-sx-inquire') });
    } else if ((btn = t.closest('[data-sx-cart]'))) {
      e.preventDefault(); opener = btn; openDrawer('cart');
    } else if ((btn = t.closest('[data-sx-wish]'))) {
      e.preventDefault(); toggleWish(btn);
    } else if ((btn = t.closest('a[href$="contact.html"]')) && /request quote/i.test(btn.textContent) && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.button) {
      e.preventDefault(); opener = btn; openDrawer('inquiry', { from: '', productId: '' });
    }
  });

  function drawerClick(t, e) {
    var b, id, l;
    if (t.closest('[data-sx-close]')) { closeDrawer(); }
    else if ((b = t.closest('[data-inc]'))) { id = b.getAttribute('data-inc'); l = line(id); if (l) { setQty(id, l.qty + 1); rerenderCart(id, 'data-inc'); announce(byId(id).title + ', quantity ' + line(id).qty); } }
    else if ((b = t.closest('[data-dec]'))) { id = b.getAttribute('data-dec'); l = line(id); if (l) { setQty(id, l.qty - 1); rerenderCart(id, 'data-dec'); announce(byId(id).title + ', quantity ' + line(id).qty); } }
    else if ((b = t.closest('[data-remove]'))) {
      id = b.getAttribute('data-remove');
      var title = byId(id).title, idx = cart.map(function (x) { return x.id; }).indexOf(id);
      ctx.added = null; remove(id); renderCart();
      var next = $$('[data-line] [data-remove]', $('#sx-drawer'))[Math.min(idx, cart.length - 1)];
      (next || $('#sx-title')).focus({ preventScroll: true });
      toast({ title: 'Removed from cart', detail: title, action: 'Undo', onAction: function () { undoRemove(); if (drawerOpen && view === 'cart') renderCart(); } });
    }
    else if (t.closest('[data-sx-checkout]')) { openDrawer('inquiry', { from: 'cart' }); }
    else if (t.closest('[data-sx-inquire-open]')) { openDrawer('inquiry', { from: cart.length ? 'cart' : '' }); }
    else if (t.closest('[data-sx-continue]')) {
      var a = t.closest('a');
      closeDrawer();
      if (a && document.body.hasAttribute('data-scope')) e.preventDefault();   // already on a product list
    }
    else if (t.closest('[data-sx-back]')) { if (ctx.from === 'cart') openDrawer('cart'); else closeDrawer(); }
    else if ((b = t.closest('[data-sx-copy]'))) {
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(ctx.reference).then(done, done); else done();
    }
  }

  /** Re-draw the cart but keep keyboard focus on the same control (or its neighbour if it became disabled). */
  function rerenderCart(id, attr) {
    ctx.added = null;
    renderCart();
    var d = $('#sx-drawer');
    var again = $('[' + attr + '="' + id + '"]', d);
    if (again && !again.disabled) again.focus();
    else { var other = $('[data-inc="' + id + '"]:not([disabled]), [data-dec="' + id + '"]:not([disabled])', d); if (other) other.focus(); }
  }

  /* ---------- wishlist (toggle, remembered) ---------- */
  var wish = read(LS, K_WISH, []);
  function paintWish() {
    $$('[data-sx-wish]').forEach(function (b) {
      var on = wish.indexOf(b.getAttribute('data-sx-wish')) > -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('sx-btn-added', on);
    });
  }
  function toggleWish(btn) {
    var id = btn.getAttribute('data-sx-wish'), i = wish.indexOf(id);
    if (i > -1) wish.splice(i, 1); else wish.push(id);
    write(LS, K_WISH, wish);
    paintWish();
    toast({ title: i > -1 ? 'Removed from wishlist' : 'Saved to wishlist', detail: byId(id) ? byId(id).title : '' });
  }

  /* ---------- product detail page ---------- */
  function initDetail() {
    var box = $('#pd-actions');
    if (!box) return;
    var id = new URLSearchParams(location.search).get('id') || 'uti-tape';
    var p = byId(id) || byId('uti-tape');
    var isUti = p.id === 'uti-tape';
    var c = SX.CATS[p.cat];

    if (!isUti) {
      document.title = p.title + ' — Sysidex';
      var set = function (sel, txt) { var el = $(sel); if (el) el.textContent = txt; };
      set('#pd-title', p.title); set('#pd-sub', c.name + ' · ' + p.sub); set('#pd-sku', 'Code: ' + p.code); set('#crumb-current', p.title);
      $$('[data-uti-only]').forEach(function (el) { el.style.display = 'none'; });
      var main = $('#pd-main');
      if (main) setHTML(main, p.img ? '<img src="../assets/images/' + p.img + '" alt="' + esc(p.title) + '" class="w-full h-full object-cover">' : SX.ui.art(p));
      var about = $('#pd-about');
      if (about) setHTML(about, '<p class="font-semibold text-ink mb-1">About this item</p><p class="text-body">Contact our engineering team for full specifications, certification documents and availability for this ' + (p.cat === 'engineering' ? 'service' : 'product') + '.</p>');
    }

    var qty = 1;
    var base = 'inline-flex items-center justify-center gap-2 h-[48px] px-8 text-sm plex font-bold uppercase tracking-wide transition-colors';
    var primary = base + ' bg-red text-white hover:bg-[#970012]';
    var secondary = base + ' border border-bd text-ink hover:bg-warm3';
    setHTML(box,
      '<p class="mt-6 text-sm text-body">Add this product to your cart to request a quotation with other items, or send a Sales Inquiry about this item only.</p>' +
      '<div class="flex flex-wrap items-center gap-4 mt-5">' +
      '<div class="flex items-center gap-3" role="group" aria-label="Quantity"><button type="button" class="' + STEP + '" id="pd-dec" aria-label="Decrease quantity" disabled>−</button><span id="pd-qty" class="min-w-[24px] text-center text-[15px] font-bold" aria-live="polite">1</span><button type="button" class="' + STEP + '" id="pd-inc" aria-label="Increase quantity">+</button></div>' +
      '<button type="button" class="' + primary + '" data-sx-add="' + esc(p.id) + '" data-flash>Add to Cart</button>' +
      '<button type="button" class="' + secondary + '" data-sx-inquire="' + esc(p.id) + '" data-sx-from="details">Sales Inquiry</button></div>');

    var dec = $('#pd-dec'), inc = $('#pd-inc'), out = $('#pd-qty');
    if (dec) {
      var sync = function () { out.textContent = qty; dec.disabled = qty <= 1; inc.disabled = qty >= MAX; };
      dec.addEventListener('click', function () { qty = Math.max(1, qty - 1); sync(); });
      inc.addEventListener('click', function () { qty = Math.min(MAX, qty + 1); sync(); });
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    ensureRoot();
    refreshHeader(false);
    initDetail();
    paintWish();
    new MutationObserver(paintWish).observe(document.body, { childList: true, subtree: true });
    if (location.hash === '#cart') openDrawer('cart');
    window.addEventListener('hashchange', function () { if (location.hash === '#cart') openDrawer('cart'); });
    window.addEventListener('storage', function (e) {
      if (e.key !== K_CART) return;
      cart = read(LS, K_CART, []);
      refreshHeader(false);
      if (drawerOpen && view === 'cart') renderCart();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  SX.cart = { add: add, count: count, open: function () { openDrawer('cart'); } };
})();
