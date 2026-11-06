/* Breaks, Fremantle — depth + status engine.
   One lerped rAF loop: hero parallax planes, the sun crossing its arc,
   in-frame image drift, gallery centre-focus. Transform/opacity only.
   Everything below is skipped under prefers-reduced-motion. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- live open status (Australia/Perth) ---------- */
  function perthNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Perth", weekday: "short",
        hour: "numeric", minute: "numeric", hourCycle: "h23"
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], mins: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
    } catch (e) { return null; }
  }
  var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function statusText() {
    var n = perthNow();
    if (!n) return null;
    var open = n.day !== 1 && n.mins >= 480 && n.mins < 960; // Mon closed; else 8:00–16:00
    if (open) return { open: true, text: "Open now in Fremantle, until 4 pm" };
    if (n.day === 1) return { open: false, text: "Closed today (Monday); back at 8 am Tuesday" };
    if (n.mins < 480) return { open: false, text: "Closed; opens 8 am today" };
    var next = (n.day + 1) % 7;
    if (next === 1) return { open: false, text: "Closed; opens 8 am Tuesday" };
    return { open: false, text: "Closed; opens 8 am " + dayNames[next] };
  }
  var st = statusText();
  if (st) {
    document.querySelectorAll("[data-status]").forEach(function (el) { el.textContent = st.text; });
    document.querySelectorAll("[data-status-dot]").forEach(function (el) {
      if (st.open) el.classList.add("open");
    });
  }
  var pn = perthNow();
  if (pn) {
    var row = document.querySelector('.hours tr[data-day="' + pn.day + '"]');
    if (row) row.classList.add("today");
  }

  /* ---------- reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  if (reduced) return;

  /* ---------- depth engine ---------- */
  var hero = document.querySelector(".hero");
  var stage = document.querySelector("[data-tilt-stage]");
  var photo = document.querySelector(".hero-photo");
  var arch = document.querySelector(".hero-arch");
  var defcard = document.querySelector(".defcard");
  var chip = document.querySelector(".ratingchip");
  var sun = document.querySelector("[data-sun]");
  var plxImgs = Array.prototype.slice.call(document.querySelectorAll("[data-plx]"));
  var gallery = document.querySelector("[data-gallery]");
  var gcards = gallery ? Array.prototype.slice.call(gallery.querySelectorAll(".gcard")) : [];

  var tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
  if (stage && finePointer) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      tiltTY = px * 5; tiltTX = -py * 4;
    });
    stage.addEventListener("pointerleave", function () { tiltTX = 0; tiltTY = 0; });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function frame() {
    var vh = window.innerHeight;

    /* hero planes + sun, driven by hero scroll progress */
    if (hero) {
      var hr = hero.getBoundingClientRect();
      var p = clamp(-hr.top / (hr.height * 0.9), 0, 1); // 0 at top, 1 as hero leaves
      var drift = clamp(-hr.top, -80, 190);
      if (photo) photo.style.transform = "translate3d(0," + (drift * 0.10).toFixed(1) + "px,0)";
      if (arch) arch.style.transform = "translate3d(0," + (drift * -0.06).toFixed(1) + "px,-70px)";
      if (defcard) defcard.style.transform = "translate3d(0," + (drift * -0.05).toFixed(1) + "px,46px)";
      if (chip) chip.style.transform = "translate3d(0," + (drift * -0.09).toFixed(1) + "px,58px)";
      if (sun) {
        var sx = p * 100;
        var sy = 50 - 44 * Math.sin(Math.PI * p);
        sun.style.left = sx.toFixed(2) + "%";
        sun.style.top = sy.toFixed(1) + "px";
        sun.style.transform = "translate(-50%,-50%)";
      }
      if (stage && finePointer) {
        tiltX += (tiltTX - tiltX) * 0.06;
        tiltY += (tiltTY - tiltY) * 0.06;
        stage.style.transform = "rotateX(" + tiltX.toFixed(2) + "deg) rotateY(" + tiltY.toFixed(2) + "deg)";
      }
    }

    /* in-frame image drift */
    for (var i = 0; i < plxImgs.length; i++) {
      var img = plxImgs[i];
      var r = img.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var prog = clamp((vh / 2 - (r.top + r.height / 2)) / vh, -1, 1);
      img.style.transform = "translate3d(0," + (prog * -9).toFixed(1) + "px,0)";
    }

    /* gallery centre-focus */
    if (gallery && gcards.length) {
      var gr = gallery.getBoundingClientRect();
      if (gr.bottom > 0 && gr.top < vh) {
        var centre = gr.left + gr.width / 2;
        for (var j = 0; j < gcards.length; j++) {
          var c = gcards[j].getBoundingClientRect();
          var d = (c.left + c.width / 2 - centre) / gr.width; // -0.5..0.5
          var rot = clamp(d * -16, -9, 9);
          var sc = 1 - Math.min(Math.abs(d) * 0.10, 0.05);
          gcards[j].style.transform = "perspective(900px) rotateY(" + rot.toFixed(2) + "deg) scale(" + sc.toFixed(3) + ")";
        }
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
