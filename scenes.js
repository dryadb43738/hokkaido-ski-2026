/* ===========================================================================
   北海道滑雪 2026 — cinematic scroll engine (scenes.js)
   Drives the pinned photo "chapters": scroll-scrubbed zoom, line-by-line text
   crossfade, the day→night dissolve, and the map that lights its resorts +
   draws routes from 旭川市 one by one. Raw scroll math (rAF) so it behaves the
   same in a real tab and in a headless capture (initial state = first frame).
   =========================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------------- map scene: city origin + routes ---------------- */
  const CITY = { x: 60.0, y: 56.5 };       // 旭川市 origin on the 1536×1024 map (%)
  const LIT_ORDER = [2, 3, 4, 5, 1];        // near → far: 聖誕→神居→CANMORE→比布→富良野
  const routeEls = [];
  const pinEls = {};
  const tagEls = {};

  function buildMap() {
    const svg = $("#routeSvg");
    const overlay = $("#mapOverlay");
    if (!svg || !overlay || typeof RESORTS === "undefined") return;
    const W = 1536, H = 1024;
    const cx = (CITY.x / 100) * W, cy = (CITY.y / 100) * H;

    LIT_ORDER.forEach((id) => {
      const r = RESORTS.find((x) => x.id === id);
      if (!r) return;
      const x = (r.x / 100) * W, y = (r.y / 100) * H;
      const mx = (cx + x) / 2, my = (cy + y) / 2;
      const dx = x - cx, dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;       // perpendicular for a gentle bow
      const bow = len * 0.12;
      const c1x = mx + nx * bow, c1y = my + ny * bow;
      const d = `M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;

      const glow = document.createElementNS(SVGNS, "path");
      glow.setAttribute("d", d);
      glow.setAttribute("class", "route-glow");
      glow.setAttribute("stroke", r.color);
      svg.appendChild(glow);

      const path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "route-path");
      path.setAttribute("stroke", r.color);
      svg.appendChild(path);

      let L = len;
      try { L = path.getTotalLength() || len; } catch (e) { /* headless fallback */ }
      [path, glow].forEach((p) => {
        p.style.strokeDasharray = L;
        p.style.strokeDashoffset = L;
      });
      routeEls.push({ id, path, glow, L });
    });

    $$(".hotspot", overlay).forEach((hs) => { pinEls[hs.dataset.id] = hs; });
    $$(".hs-tag", overlay).forEach((t) => { tagEls[t.dataset.id] = t; });

    const city = document.createElement("div");
    city.className = "city-dot";
    city.style.left = CITY.x + "%";
    city.style.top = CITY.y + "%";
    city.innerHTML = '<span class="ping" aria-hidden="true"></span><span class="core"></span><span class="label">旭川市 出發</span>';
    overlay.appendChild(city);
  }

  function updateMap(p) {
    const n = LIT_ORDER.length;
    const start = 0.06, span = 0.78;            // spread lighting across the pin
    let lit = 0;
    LIT_ORDER.forEach((id, i) => {
      const a = start + (i / n) * span;          // route starts drawing
      const b = a + (span / n) * 0.9;            // → fully drawn, pin pops
      const t = clamp((p - a) / (b - a), 0, 1);
      const ro = routeEls.find((x) => x.id === id);
      if (ro) {
        const off = ro.L * (1 - t);
        ro.path.style.strokeDashoffset = off;
        ro.glow.style.strokeDashoffset = off;
      }
      const on = t >= 0.99;
      const pin = pinEls[id], tag = tagEls[id];
      if (pin) {
        const was = pin.classList.contains("lit");
        pin.classList.toggle("lit", on);
        if (on && !was) {
          pin.classList.add("justlit");
          setTimeout(() => pin.classList.remove("justlit"), 650);
        }
      }
      if (tag) tag.classList.toggle("lit", on);
      if (on) lit++;
    });
    const cnt = $("#mapLitCount");
    if (cnt) cnt.textContent = lit;
  }

  /* ---------------- generic scene update ---------------- */
  function updateScene(scene, p) {
    const kind = scene.dataset.scene;
    if (kind === "map") { updateMap(p); return; }

    // background zoom / drift
    $$(".scene-bg", scene).forEach((bg) => {
      const zf = parseFloat(bg.dataset.zfrom || "1");
      const zt = parseFloat(bg.dataset.zto || "1");
      const yt = parseFloat(bg.dataset.yto || "0");
      const s = lerp(zf, zt, p);
      const y = lerp(0, yt, p);
      bg.style.transform = `scale(${s.toFixed(4)}) translateY(${y.toFixed(2)}%)`;
    });

    // day → night dissolve
    if (kind === "daynight") {
      const night = $(".bg-night", scene);
      const veil = $("#nightVeil");
      if (night) night.style.opacity = clamp((p - 0.42) / 0.30, 0, 1).toFixed(3);
      if (veil) veil.style.opacity = (clamp((p - 0.40) / 0.45, 0, 1) * 0.92).toFixed(3);
    }

    // line-by-line frame crossfade
    const frames = $$(".frame", scene);
    const N = frames.length;
    if (N) {
      const seg = 1 / N;
      const fade = seg * 0.30;
      frames.forEach((fr, i) => {
        const s0 = i * seg, e0 = (i + 1) * seg;
        let o;
        if (i === 0) o = 1;                                   // first: visible from start
        else if (p < s0 - fade) o = 0;
        else if (p < s0) o = (p - (s0 - fade)) / fade;        // fade in
        else o = 1;
        if (i !== N - 1) {                                    // last frame holds open
          if (p >= e0) o = 0;
          else if (p >= e0 - fade) o = Math.min(o, 1 - (p - (e0 - fade)) / fade);
        }
        o = clamp(o, 0, 1);
        fr.style.opacity = o.toFixed(3);
        fr.style.transform = `translateY(${((1 - o) * 16).toFixed(1)}px)`;
      });
    }

    // hero scroll cue fades as we move off the top
    if (kind === "hero") {
      const cue = $("#heroCue");
      if (cue) cue.style.opacity = clamp(1 - p * 4, 0, 1).toFixed(3);
    }
  }

  function sceneProgress(scene) {
    const rect = scene.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const range = scene.offsetHeight - vh;        // length of the pinned region
    if (range <= 0) return 0;
    return clamp((-rect.top) / range, 0, 1);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    const scenes = $$(".scene[data-scene]");
    buildMap();

    let ticking = false;
    function frame() {
      scenes.forEach((sc) => updateScene(sc, sceneProgress(sc)));
      ticking = false;
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // initial paint: every scene at p=0 → first frame shown, never blank
    frame();
    setTimeout(frame, 80);
    // re-measure once the big hero photo decodes (offsets can shift)
    const heroImg = $('[data-scene="hero"] img');
    if (heroImg && !heroImg.complete) heroImg.addEventListener("load", frame, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
