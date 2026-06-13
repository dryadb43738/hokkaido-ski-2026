/* ===========================================================================
   北海道滑雪 2026 — app
   Renders content from data.js, wires hover hotspots, todo toggles, and the
   GSAP ScrollTrigger scroll experience. Live data pulled from published Google
   Sheets CSVs (行程 + 待辦 tabs); falls back to data.js values on failure.
   =========================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  /* ---------- Google Sheets live data ---------- */
  const SHEETS_BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROPP8Lg2SyGQ43pwdDv4TaSEI3QxbNYLKTawWLOQyKn-CKPVRSe-7UHnnlrMVFi4hI3TY2iFuu5qcR/pub";
  const PUB = {
    itin:   SHEETS_BASE + "?single=true&output=csv&gid=1157090351",
    todo:   SHEETS_BASE + "?single=true&output=csv&gid=639515683",
    flight: SHEETS_BASE + "?gid=1510991736&single=true&output=csv",
  };

  function parseCSV(text) {
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === ',') { row.push(cur); cur = ""; }
        else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; }
        else if (c !== '\r') cur += c;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function(r) { return r.some(function(x) { return x !== ""; }); });
  }

  async function fetchCSV(url, skipRows) {
    var resp = await fetch(url);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var rows = parseCSV(await resp.text());
    rows = rows.slice(skipRows || 0);
    var head = rows.shift() || [];
    return rows.map(function(r) {
      var o = {};
      head.forEach(function(h, i) { o[(h || "").trim()] = (r[i] || "").trim(); });
      return o;
    });
  }

  async function loadSheetData() {
    try {
      // ─── 行程 (skip row 0 = tab title, row 1 = headers) ───
      var itinRows = await fetchCSV(PUB.itin, 1);
      itinRows = itinRows.filter(function(r) { return /\d+\/\d+/.test(r["日期"] || ""); });
      if (itinRows.length) {
        ITINERARY.length = 0;
        itinRows.forEach(function(r) {
          var pin = /富良野/.test(r["重點"] || "") ? "富良野" : undefined;
          ITINERARY.push({ date: r["日期"], w: r["星期"], t: r["重點"], p: r["安排"], pin: pin });
        });
      }
    } catch(e) { console.warn("[sheet] 行程 fetch 失敗:", e); }

    try {
      // ─── 待辦 (skip row 0 = tab title, row 1 = headers) ───
      var todoRows = await fetchCSV(PUB.todo, 1);
      todoRows = todoRows.filter(function(r) { return /^\d+$/.test(r["#"] || ""); });
      if (todoRows.length) {
        TODOS.length = 0;
        todoRows.forEach(function(r) {
          var st = r["狀態"] || "";
          TODOS.push({
            task:  r["待辦事項"] || "",
            owner: r["負責人"]  || "",
            done:  st !== "" && st !== "待辦",
          });
        });
      }
    } catch(e) { console.warn("[sheet] 待辦 fetch 失敗:", e); }

    try {
      // ─── 航班進度 (no tab title row; first row = headers) ───
      var flightRows = await fetchCSV(PUB.flight, 0);
      flightRows = flightRows.filter(function(r) { return (r["團員"] || "").trim() !== ""; });
      if (flightRows.length) {
        FLIGHTS.length = 0;
        flightRows.forEach(function(r) {
          FLIGHTS.push({ name: (r["團員"] || "").trim(), filled: (r["狀態"] || "").trim() === "已填" });
        });
      }
    } catch(e) { console.warn("[sheet] 航班 fetch 失敗:", e); }
  }

  /* ---------- countdown ---------- */
  function daysTo(iso) {
    const dep = new Date(iso + "T00:00:00");
    return Math.max(0, Math.ceil((dep - new Date()) / 86400000));
  }
  function countdownProgress() {
    const dep = new Date(TRIP.departISO + "T00:00:00");
    const start = new Date(TRIP.startISO + "T00:00:00");
    const now = new Date();
    return Math.min(100, Math.max(0, (1 - (dep - now) / (dep - start)) * 100));
  }
  const DAYS = daysTo(TRIP.departISO);

  /* ---------- hero members + stats ---------- */
  function renderMembers() {
    const wrap = $("#heroMembers");
    TRIP.members.forEach((m) => {
      const c = el("span", "member");
      c.innerHTML = `<span class="dot" style="background:${m.color}"></span>${esc(m.name)}`;
      wrap.appendChild(c);
    });
  }
  function renderStats() {
    const band = $("#statBand");
    STATS.forEach((s) => {
      const n = s.id === "days" ? String(DAYS) : s.n;
      const item = el("div", "stat");
      item.innerHTML = `<div class="n"><span data-count="${s.id === "days" ? DAYS : ""}">${esc(n)}</span><span class="unit">${esc(s.unit)}</span></div><div class="l">${esc(s.label)}</div>`;
      band.appendChild(item);
    });
    $("#navDays").textContent = DAYS;
  }

  /* ---------- resorts: hotspots + cards ---------- */
  function isTodo(v) { return /待補充|待估/.test(v); }

  function renderResorts() {
    const overlay = $("#mapOverlay");
    const grid = $("#resortGrid");
    RESORTS.forEach((r) => {
      // hotspot pin — no number (the map already labels them); lit on scroll
      const hs = el("button", "hotspot");
      hs.style.left = r.x + "%";
      hs.style.top = r.y + "%";
      hs.style.setProperty("--hs-color", r.color);
      hs.innerHTML = '<span class="pin-core"></span>';
      hs.setAttribute("aria-label", r.name);
      hs.dataset.id = r.id;
      overlay.appendChild(hs);

      // name tag beside the pin, revealed when the pin lights up
      const leftSide = r.x > 55;
      const tag = el("span", "hs-tag");
      tag.dataset.id = r.id;
      tag.style.left = r.x + "%";
      tag.style.top = r.y + "%";
      tag.style.transform = leftSide
        ? "translate(calc(-100% - 16px), -50%)"
        : "translate(16px, -50%)";
      tag.innerHTML = `<span class="dot" style="background:${r.color}"></span>${esc(r.name)}`;
      overlay.appendChild(tag);

      // card
      const card = el("article", "resort-card");
      card.dataset.id = r.id;
      card.innerHTML =
        `<div class="rc-top"><span class="rc-badge" style="background:${r.color}">${r.id}</span>` +
        `<div><div class="rc-name">${esc(r.name)}</div><div class="rc-en">${esc(r.en)}</div></div></div>` +
        `<p class="rc-desc">${esc(r.desc)}</p>` +
        `<div class="rc-meta"><span><span class="k">距離 </span><b>${esc(r.km)}</b></span>` +
        `<span><span class="k">車程 </span><b>${esc(r.min)}</b></span></div>`;
      grid.appendChild(card);
    });
    wireHotspots();
  }

  function tipHTML(r) {
    const rows = r.extra.map((e) => {
      const todo = isTodo(e.v);
      return `<div class="tip-row${todo ? " todo" : ""}"><span>${esc(e.k)}</span><span>${esc(e.v)}</span></div>`;
    }).join("");
    return (
      `<div class="tip-head"><span class="tip-badge" style="background:${r.color}">${r.id}</span>` +
      `<div><div class="tip-name">${esc(r.name)}</div><div class="tip-en">${esc(r.en)}</div></div></div>` +
      `<div class="tip-meta"><span>距離 <b>${esc(r.km)}</b></span><span>車程 <b>${esc(r.min)}</b></span></div>` +
      `<div class="tip-rows">${rows}</div>`
    );
  }

  function wireHotspots() {
    const tip = $("#hotspotTip");
    const overlay = $("#mapOverlay");
    let active = null;

    function showFor(hs) {
      const r = RESORTS.find((x) => String(x.id) === hs.dataset.id);
      if (!r) return;
      tip.innerHTML = tipHTML(r);
      tip.classList.add("show");
      tip.setAttribute("aria-hidden", "false");
      positionTip(hs);
      hs.classList.add("active");
      // sync card highlight
      const card = $(`.resort-card[data-id="${r.id}"]`);
      if (card) card.style.boxShadow = "0 2px 2px rgba(0,0,0,.04), 0 16px 32px -8px rgba(0,0,0,.16), 0 0 0 1.5px " + r.color + " inset";
      active = hs;
    }
    function hide() {
      tip.classList.remove("show");
      tip.setAttribute("aria-hidden", "true");
      if (active) {
        active.classList.remove("active");
        const card = $(`.resort-card[data-id="${active.dataset.id}"]`);
        if (card) card.style.boxShadow = "";
      }
      active = null;
    }
    function positionTip(hs) {
      const hr = hs.getBoundingClientRect();
      const tr = tip.getBoundingClientRect();
      let left = hr.left + hr.width / 2 - tr.width / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - tr.width - 12));
      let top = hr.top - tr.height - 14;            // prefer above
      if (top < 12) top = hr.bottom + 14;            // else below
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }

    overlay.querySelectorAll(".hotspot").forEach((hs) => {
      hs.addEventListener("mouseenter", () => showFor(hs));
      hs.addEventListener("mouseleave", hide);
      hs.addEventListener("focus", () => showFor(hs));
      hs.addEventListener("blur", hide);
      hs.addEventListener("click", (e) => {
        e.preventDefault();
        if (active === hs) { hide(); } else { showFor(hs); }
      });
    });
    window.addEventListener("scroll", () => { if (active) hide(); }, { passive: true });
  }

  /* ---------- transport facts ---------- */
  function renderFacts() {
    const row = $("#factsRow");
    if (!row) return;
    const facts = [
      { k: "OUTBOUND / 去程", v: "新千歳 <span class='mono'>下午傍晚</span> 抵達", p: "12/27 落地 → JR 特急前往旭川" },
      { k: "RAIL / 鐵路", v: "JR 特急 <span class='mono'>≈90 分</span>", p: "新千歲 ⇄ 旭川來回 · 需訂位" },
      { k: "RETURN / 回程", v: "新千歲 <span class='mono'>下午</span> 起飛", p: "1/2 退房 → 約 12:30 抵新千歲" },
    ];
    facts.forEach((f) => {
      const c = el("div", "fact reveal");
      c.innerHTML = `<div class="k">${f.k}</div><div class="v">${f.v}</div><div class="p">${esc(f.p)}</div>`;
      row.appendChild(c);
    });
  }

  /* ---------- itinerary ---------- */
  function renderItinerary() {
    const ol = $("#timeline");
    ITINERARY.forEach((d) => {
      const li = el("li", "tl-item reveal");
      const pin = d.pin ? ` <span class="tl-pin">${esc(d.pin)}</span>` : "";
      li.innerHTML =
        `<div class="tl-date"><span class="d">${esc(d.date)}</span><span class="w">${esc(d.w)}</span></div>` +
        `<div class="tl-body"><div class="t">${esc(d.t)}${pin}</div><div class="p">${esc(d.p)}</div></div>`;
      ol.appendChild(li);
    });
  }

  /* ---------- checklist ---------- */
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function memberColor(name) {
    const m = TRIP.members.find((x) => x.name === name);
    return m ? m.color : null;
  }
  function renderChecklist() {
    const list = $("#todoList");
    TODOS.forEach((t) => {
      const row = el("div", "todo" + (t.done ? " done" : ""));
      const col = memberColor(t.owner);
      const owner = t.owner
        ? `<span class="owner">${col ? `<span class="dot" style="background:${col}"></span>` : ""}${esc(t.owner)}</span>`
        : `<span class="owner none">未指派</span>`;
      row.innerHTML = `<span class="check">${CHECK_SVG}</span><span class="task">${esc(t.task)}</span>${owner}`;
      list.appendChild(row);
    });
    renderProgressCard();
  }
  function renderProgressCard() {
    const c = $("#progressCard");
    c.innerHTML =
      `<div class="pc-big"><span id="pcDone">0</span><span class="unit"> / ${TODOS.length}</span></div>` +
      `<div class="pc-label">待辦完成</div>` +
      `<div class="pc-track"><i id="pcBar"></i></div>` +
      `<div class="pc-sub">` +
      `<div class="row"><span>倒數出發</span><b>${DAYS} 天</b></div>` +
      `<div class="row"><span>籌備進度</span><b id="pcPct">0%</b></div>` +
      `</div>`;
    updateProgress();
  }
  function updateProgress() {
    const done = TODOS.filter((t) => t.done).length;
    const pct = Math.round((done / TODOS.length) * 100);
    const d = $("#pcDone"), bar = $("#pcBar"), p = $("#pcPct");
    if (d) d.textContent = done;
    if (bar) bar.style.width = pct + "%";
    if (p) p.textContent = pct + "%";
  }

  /* ---------- flight progress card ---------- */
  function renderFlightCard() {
    const c = $("#flightCard");
    if (!c) return;
    const filledCount = FLIGHTS.filter(function(f) { return f.filled; }).length;
    let html = '<p class="fc-title">FLIGHTS / 航班資料</p><div class="fc-rows">';
    FLIGHTS.forEach(function(f) {
      const m = TRIP.members.find(function(x) { return x.name === f.name; });
      const color = m ? m.color : "#999";
      html +=
        '<div class="fc-row">' +
        '<span class="fc-dot" style="background:' + color + '"></span>' +
        '<span class="fc-name">' + esc(f.name) + '</span>' +
        '<span class="fc-status ' + (f.filled ? "filled" : "pending") + '">' + (f.filled ? "已填" : "待填") + '</span>' +
        '</div>';
    });
    html += '</div>';
    html += '<div class="fc-footer"><span>已填</span><b>' + filledCount + ' / ' + FLIGHTS.length + ' 人</b></div>';
    c.innerHTML = html;
  }

  /* ---------- budget + reminders ---------- */
  function renderBudget() {
    const rows = $("#budgetRows");
    BUDGET.forEach((b) => {
      const r = el("div", "br");
      r.innerHTML = `<span>${esc(b.k)}</span><span class="v${b.todo ? " todo" : ""}">${esc(b.v)}</span>`;
      rows.appendChild(r);
    });
    const rem = $("#reminders");
    REMINDERS.forEach((m) => {
      const r = el("div", "rem");
      r.innerHTML = `<span class="ic">${m.ic}</span><div><div class="t">${esc(m.t)}</div><div class="p">${esc(m.p)}</div></div>`;
      rem.appendChild(r);
    });
  }

  /* ---------- scroll experience ---------- */
  function initScroll() {
    const nav = $("#nav");
    const prog = $("#scrollProgress");
    const links = Array.from(document.querySelectorAll(".nav-links a"));
    const sections = ["overview", "resorts", "itinerary", "checklist", "budget"]
      .map((id) => document.getElementById(id)).filter(Boolean);

    function onScroll() {
      const st = window.scrollY || document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
      nav.classList.toggle("scrolled", st > 8);
      // active link
      let cur = sections[0];
      for (const s of sections) { if (s.getBoundingClientRect().top <= 140) cur = s; }
      const id = cur && cur.id;
      links.forEach((a) => a.classList.toggle("active", a.dataset.nav === id || (id === "budget" && a.dataset.nav === "checklist")));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const hasGSAP = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
    // Live query so newly injected .reveal items (after Sheet re-render) are caught
    function revealCheck() {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll(".reveal").forEach(function(n) {
        if (n.classList.contains("is-in")) return;
        const r = n.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) n.classList.add("is-in");
      });
    }
    window.addEventListener("scroll", revealCheck, { passive: true });
    window.addEventListener("resize", revealCheck);
    revealCheck();
    setTimeout(revealCheck, 60);

    // Safety net: if the animation ticker is frozen (offscreen/headless preview),
    // CSS transitions never advance — force everything visible so content is
    // never blank. In a real foreground tab the ticker runs and reveals animate.
    let ticks = 0;
    const tick = () => { ticks++; if (ticks < 3) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(() => { if (ticks < 2) document.documentElement.classList.add("force-show"); }, 900);

    if (hasGSAP) {
      gsap.registerPlugin(ScrollTrigger);
      // mesh parallax
      const mesh = $(".mesh");
      if (mesh) gsap.to(mesh, { y: 120, ease: "none", scrollTrigger: { trigger: "#overview", start: "top top", end: "bottom top", scrub: true } });
      // countdown count-up
      const cd = document.querySelector('[data-count="' + DAYS + '"]');
      if (cd) {
        const obj = { v: 0 };
        gsap.to(obj, { v: DAYS, duration: 1.1, ease: "power2.out", delay: 0.2, onUpdate: () => { cd.textContent = Math.round(obj.v); } });
      }
    } else {
      document.querySelectorAll(".reveal").forEach((n) => n.classList.add("is-in"));
    }
  }

  /* ---------- boot ---------- */
  async function init() {
    renderMembers();
    renderStats();
    renderResorts();
    renderFacts();
    // Render static placeholders immediately so the page isn't blank
    renderItinerary();
    renderChecklist();
    renderFlightCard();
    renderBudget();
    initScroll();
    // Then fetch live data from Google Sheets and re-render affected sections
    await loadSheetData();
    // Re-render with live data
    const tl = $("#timeline");
    if (tl) tl.innerHTML = "";
    renderItinerary();
    const todoList = $("#todoList");
    if (todoList) todoList.innerHTML = "";
    const progressCard = $("#progressCard");
    if (progressCard) progressCard.innerHTML = "";
    renderChecklist();
    renderFlightCard();
    // Trigger reveal for any newly rendered items already in viewport
    window.dispatchEvent(new Event("scroll"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
