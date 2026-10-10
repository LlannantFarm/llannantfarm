/* Llannant Farm blocks
 *
 * Squarespace Code Block (one or more per page):
 *   <div class="lf-block" data-show="status"></div>
 *   <script src="https://llannantfarm.github.io/llannantfarm/farm.js" defer></script>
 *
 * Attributes on each .lf-block div:
 *   data-show="status"      what to draw: status, seasons or visit (required)
 *   data-crop="pumpkins"    only this crop (status and seasons)
 *   data-link="/#visit"     where the status strip's button goes when there's no booking link
 *   data-accent="#d4652a"   accent colour
 *
 * Data comes from farm.json beside this script, edited from admin.html.
 * Opening status is worked out from the dates and hours in UK time, so it never goes stale.
 * Testing: add ?lf-now=2026-10-17T11:00 to the page address to see the page as it would be then.
 */
(function () {
  var script = document.currentScript;
  var base = script ? script.src.replace(/farm\.js(\?.*)?$/, "") : "https://llannantfarm.github.io/llannantfarm/";
  var roots = [].slice.call(document.querySelectorAll(".lf-block:not([data-lf-done])"));
  if (!roots.length) return;
  roots.forEach(function (r) { r.setAttribute("data-lf-done", ""); });

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (!document.getElementById("lf-css")) {
    var css = document.createElement("style");
    css.id = "lf-css";
    css.textContent =
      ".lf-block{--lf-accent:#d4652a;--lf-green:#2c4428;display:block;width:100%;color:inherit;font-family:inherit;font-size:inherit;line-height:1.6}" +
      ".lf-block *{box-sizing:border-box}" +
      ".lf-block a{color:inherit}" +
      ".lf-btn{display:inline-block;padding:.7em 1.3em;border-radius:999px;background:var(--lf-accent);color:#fff!important;font-weight:600;text-decoration:none!important;white-space:nowrap}" +
      ".lf-btn:hover{filter:brightness(.92)}" +
      ".lf-pill{display:inline-block;font-size:.75em;font-weight:700;letter-spacing:.04em;padding:3px 10px;border-radius:999px;background:#eee;color:#555}" +
      ".lf-pill.open{background:#e3f4dc;color:#2d6a1f}.lf-pill.soon{background:#fdecc8;color:#8a5a00}" +
      /* status strip */
      ".lf-status{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 18px;padding:16px 20px;border-radius:12px;background:var(--lf-green);color:#fff;text-align:center}" +
      ".lf-status .lf-dot{width:10px;height:10px;border-radius:50%;background:#f0c24b;flex:none}" +
      ".lf-status.open .lf-dot{background:#7ddc6a;box-shadow:0 0 0 4px rgba(125,220,106,.3)}" +
      ".lf-status .lf-stext{font-size:1.05em}" +
      ".lf-status .lf-stext small{display:block;opacity:.85;font-size:.85em}" +
      /* season cards */
      ".lf-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:24px}" +
      ".lf-card{display:flex;flex-direction:column;border:1px solid rgba(128,128,128,.25);border-radius:14px;overflow:hidden;min-width:0}" +
      ".lf-media{aspect-ratio:4/3;background:linear-gradient(135deg,#e88a4a,#c4561d);display:flex;align-items:center;justify-content:center;font-size:4em}" +
      ".lf-media img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".lf-cbody{padding:18px 20px 22px;display:flex;flex-direction:column;gap:6px;flex:1}" +
      ".lf-cname{font-size:1.3em;font-weight:600;line-height:1.25;margin:4px 0 0}" +
      ".lf-meta{font-size:.92em;opacity:.75;margin:0}" +
      ".lf-when{font-weight:600;margin:4px 0 0}" +
      ".lf-cbody p{margin:0}" +
      ".lf-cbody .lf-btn{margin-top:auto;align-self:flex-start}" +
      ".lf-cbody .lf-spacer{margin-top:auto}" +
      /* visit */
      ".lf-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:14px;margin:0 0 1.6em}" +
      ".lf-fact{border-left:4px solid var(--lf-accent);padding:4px 0 4px 14px}" +
      ".lf-fact strong{display:block}" +
      ".lf-fact p{margin:0}" +
      ".lf-block .lf-fact a{color:var(--lf-accent)!important;font-weight:600;text-decoration:underline!important;text-underline-offset:3px}" +
      ".lf-block .lf-fact a.lf-btn{display:inline-block;margin-top:8px;padding:.5em 1.1em;font-size:.95em;text-decoration:none!important;color:#fff!important;background:var(--lf-accent);white-space:normal;max-width:100%}" +
      ".lf-fact.lf-wide{grid-column:1/-1}" +
      ".lf-faq details{border-bottom:1px solid rgba(128,128,128,.25);padding:12px 0}" +
      ".lf-faq summary{cursor:pointer;font-weight:600}" +
      ".lf-faq details p{margin:.5em 0 0;opacity:.85}";
    document.head.appendChild(css);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) { return /^(https?:|mailto:|tel:|\/|#)/i.test(u || "") ? u : ""; }

  // Current date and minutes past midnight in UK time (or the ?lf-now= test override)
  function ukNow() {
    var m = location.search.match(/[?&]lf-now=(\d{4}-\d{2}-\d{2})(?:T(\d{1,2}):(\d{2}))?/);
    if (m) return { date: m[1], mins: m[2] ? +m[2] * 60 + +m[3] : 9 * 60 };
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, mins: +p.hour * 60 + +p.minute };
  }
  function mins(t) { var a = String(t || "0:00").split(":"); return +a[0] * 60 + +(a[1] || 0); }
  function fmtTime(t) {
    var m = mins(t), h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return h + (mm ? ":" + (mm < 10 ? "0" : "") + mm : "") + ap;
  }
  function parts(d) { var a = d.split("-"); return { y: +a[0], m: +a[1] - 1, d: +a[2], wd: new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])).getUTCDay() }; }
  function addDays(d, n) { var p = parts(d), x = new Date(Date.UTC(p.y, p.m, p.d + n)); return x.toISOString().slice(0, 10); }
  function fmtDay(d, today) {
    if (d === addDays(today, 1)) return "tomorrow";
    var p = parts(d);
    return DAYS[p.wd] + " " + p.d + " " + MONTHS[p.m];
  }
  // "Saturdays 10 & 17 October", or "Saturday 10 October & Sunday 11 October"
  function fmtDates(list) {
    if (!list.length) return "";
    var ps = list.map(parts);
    var sameDay = ps.every(function (p) { return p.wd === ps[0].wd; });
    var sameMonth = ps.every(function (p) { return p.m === ps[0].m; });
    var join = function (a) { return a.length < 2 ? a[0] : a.slice(0, -1).join(", ") + " & " + a[a.length - 1]; };
    if (sameMonth && sameDay) return DAYS[ps[0].wd] + (ps.length > 1 ? "s " : " ") + join(ps.map(function (p) { return p.d; })) + " " + MONTHS[ps[0].m];
    return join(ps.map(function (p) { return DAYS[p.wd] + " " + p.d + " " + MONTHS[p.m]; }));
  }
  function hours(c) { return fmtTime(c.open || "10:00") + "–" + fmtTime(c.close || "16:00"); }

  // open | soon | closed, with the wording to go with it
  function cropState(c, now) {
    var dates = (c.dates || []).slice().sort();
    var openM = mins(c.open || "10:00"), closeM = mins(c.close || "16:00");
    var upcoming = dates.filter(function (d) { return d > now.date || (d === now.date && now.mins < closeM); });
    if (c.soldOut) return { state: "closed", pill: "Sold out", upcoming: [] };
    if (upcoming[0] === now.date) {
      return now.mins >= openM
        ? { state: "open", pill: "Open now", headline: "open now until " + fmtTime(c.close || "16:00"), upcoming: upcoming }
        : { state: "open", pill: "Open today", headline: "open today, " + hours(c), upcoming: upcoming };
    }
    if (upcoming.length) return { state: "soon", pill: "Next open " + fmtDay(upcoming[0], now.date), headline: "next open " + fmtDay(upcoming[0], now.date), upcoming: upcoming };
    return { state: "closed", pill: c.nextSeason ? "Back " + c.nextSeason : "Closed", upcoming: [] };
  }

  // Nothing in season: hide the strip, and its Squarespace section too if the strip is all that's in it
  function hideStatus(root) {
    root.style.display = "none";
    var section = root.closest && root.closest("section");
    if (section && section.querySelectorAll(".fe-block, .sqs-block").length <= 2 && !section.querySelector(".lf-block:not([data-show=status])")) {
      section.style.display = "none";
    }
  }

  function renderStatus(root, data, crops, now) {
    var b = data.banner || {};
    var btn = function (href, label) { href = safeUrl(href); return href ? '<a class="lf-btn" href="' + esc(href) + '">' + esc(label) + "</a>" : ""; };
    if (b.message) {
      root.innerHTML = '<div class="lf-status open"><span class="lf-dot"></span><span class="lf-stext">' + esc(b.message) + "</span>" + btn(b.link, "Find out more") + "</div>";
      return;
    }
    var picked = null;
    crops.forEach(function (c) {
      var s = cropState(c, now);
      if (s.state === "closed") return;
      if (!picked || (s.state === "open" && picked.s.state !== "open") || (s.state === picked.s.state && s.upcoming[0] < picked.s.upcoming[0])) picked = { c: c, s: s };
    });
    if (!picked) { hideStatus(root); return; }
    var c = picked.c, s = picked.s;
    var title = "<strong>" + esc(c.emoji || "") + " Pick your own " + esc(c.name.toLowerCase()) + ": " +
      esc(s.state === "open" ? s.headline : fmtDates(s.upcoming) + ", " + hours(c)) + "</strong>";
    var sub = s.state === "soon" ? "Next open " + fmtDay(s.upcoming[0], now.date) + (c.tagline ? ". " + c.tagline : "") : c.tagline;
    root.innerHTML = '<div class="lf-status ' + s.state + '"><span class="lf-dot"></span><span class="lf-stext">' + title +
      (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span>" +
      (c.bookingUrl ? btn(c.bookingUrl, "Book a slot") : btn(root.getAttribute("data-link"), "Find us")) + "</div>";
  }

  function renderSeasons(root, data, crops, now) {
    root.innerHTML = '<div class="lf-cards">' + crops.map(function (c) {
      var s = cropState(c, now);
      var img = safeUrl(c.image);
      var when = s.state === "closed"
        ? (c.soldOut ? "Sold out. Thank you!" : c.closedNote || "")
        : fmtDates(s.upcoming) + ", " + hours(c);
      var book = s.state !== "closed" && safeUrl(c.bookingUrl);
      return '<article class="lf-card"><div class="lf-media">' +
        (img ? '<img src="' + esc(img) + '" alt="' + esc(c.imageAlt || c.name) + '" loading="lazy">' : esc(c.emoji || "")) + "</div>" +
        '<div class="lf-cbody"><div><span class="lf-pill ' + s.state + '">' + esc(s.pill) + "</span></div>" +
        '<h3 class="lf-cname">' + esc(c.name) + "</h3>" +
        (c.season ? '<p class="lf-meta">' + esc(c.season) + "</p>" : "") +
        (when ? '<p class="lf-when">' + esc(when) + "</p>" : "") +
        (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
        (book ? '<a class="lf-btn" href="' + esc(book) + '">Book a slot</a>' : '<span class="lf-spacer"></span>') +
        "</div></article>";
    }).join("") + "</div>";
  }

  function renderVisit(root, data, crops, now) {
    var v = data.visit || {};
    var facts = [];
    var addr = [v.address, v.postcode].filter(Boolean).join(", ");
    if (addr) {
      var maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Llannant Farm, " + addr);
      facts.push({ label: "Address", wide: true, html: esc(addr) + '<br><a class="lf-btn" href="' + esc(maps) + '" target="_blank" rel="noopener">📍 Directions in Google Maps</a>' });
    }
    if (v.what3words) {
      var w = v.what3words.replace(/^\/+/, "");
      facts.push({ label: "what3words", html: '<a href="https://what3words.com/' + esc(w) + '" target="_blank" rel="noopener">///' + esc(w) + "</a>" });
    }
    if (v.directions) facts.push({ label: "Directions", html: esc(v.directions) });
    crops.forEach(function (c) {
      var s = cropState(c, now);
      if (s.state !== "closed") facts.push({ label: (c.emoji ? c.emoji + " " : "") + c.name, html: esc(fmtDates(s.upcoming)) + "<br>" + esc(hours(c)) });
    });
    (v.facts || []).forEach(function (f) { if (f.label && f.text) facts.push({ label: f.label, html: esc(f.text) }); });
    var faqs = (v.faqs || []).filter(function (f) { return f.q && f.a; });
    root.innerHTML =
      (facts.length ? '<div class="lf-facts">' + facts.map(function (f) {
        return '<div class="lf-fact' + (f.wide ? " lf-wide" : "") + '"><strong>' + esc(f.label) + "</strong><p>" + f.html + "</p></div>";
      }).join("") + "</div>" : "") +
      (faqs.length ? '<div class="lf-faq">' + faqs.map(function (f) {
        return "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>";
      }).join("") + "</div>" : "");
  }

  var RENDER = { status: renderStatus, seasons: renderSeasons, visit: renderVisit };

  // Bust GitHub Pages' 10-minute browser cache once a minute so edits show up quickly
  fetch(base + "farm.json?v=" + Math.floor(Date.now() / 60000))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var now = ukNow();
      roots.forEach(function (root) {
        var accent = root.getAttribute("data-accent");
        if (accent) root.style.setProperty("--lf-accent", accent);
        var only = root.getAttribute("data-crop");
        var crops = (data.crops || []).filter(function (c) { return !only || c.id === only; });
        var fn = RENDER[(root.getAttribute("data-show") || "").trim()];
        if (fn) fn(root, data, crops, now);
      });
    })
    .catch(function () {
      roots.forEach(function (root) { if (root.getAttribute("data-show") === "status") hideStatus(root); });
    });
})();
