(function () {
  var toggle = document.querySelector('.mobile-nav-toggle');
  var nav = document.getElementById('mobile-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    nav.hidden = isOpen;
    toggle.classList.toggle('is-open', !isOpen);
  });
})();

(function () {
  var track = document.querySelector('.carousel-track');
  var prev = document.querySelector('.carousel-nav--prev');
  var next = document.querySelector('.carousel-nav--next');
  var dots = document.querySelectorAll('.carousel-dots .dot');
  if (!track || !prev || !next) return;

  var step = 180;

  function updateDots() {
    if (!dots.length) return;
    var ratio = track.scrollLeft / Math.max(track.scrollWidth - track.clientWidth, 1);
    var index = Math.min(dots.length - 1, Math.round(ratio * (dots.length - 1)));
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
    });
  }

  prev.addEventListener('click', function () {
    track.scrollBy({ left: -step, behavior: 'smooth' });
  });
  next.addEventListener('click', function () {
    track.scrollBy({ left: step, behavior: 'smooth' });
  });
  track.addEventListener('scroll', updateDots);
})();
