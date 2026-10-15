(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const KEY = "gamepick.v1";

  // ---------- state (per Browser, bleibt bei Reload) ----------
  const fresh = () => ({ votes: {}, order: [], manual: false, voter: "", sent: false });
  let S = fresh();
  try { S = { ...S, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
  if (!Array.isArray(S.order) || typeof S.votes !== "object" || !S.votes) S = fresh();
  if (!/^\d+$/.test(S.voter)) S.voter = ""; // alte Zufalls-IDs verwerfen
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  save();

  const THUMB = `<svg viewBox="0 0 24 24"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`;
  const THUMB_DOWN = THUMB.replace("<path", '<g transform="rotate(180 12 12)"><path').replace("</svg>", "</g></svg>");
  const img = (g) => `assets/img/${g.id}-hero.jpg`;
  const logo = (g) => `assets/img/${g.id}-logo.png`;
  const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));

  // ---------- hero ----------
  const m = new Date().getMonth();
  $("#season").textContent = ["WINTER", "WINTER", "FRÜHLING", "FRÜHLING", "FRÜHLING", "SOMMER", "SOMMER", "SOMMER", "HERBST", "HERBST", "HERBST", "WINTER"][m] + " " + new Date().getFullYear();

  const mq = GAMES.map((g) =>
    `<img src="${logo(g)}" alt="" data-name="${g.name}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'mq-txt',textContent:this.dataset.name}))"><span class="sep">✦</span>`
  ).join("");
  $("#marquee").innerHTML = mq + mq;

  // ---------- geheime Zahl ----------
  const voterInput = $("#voterInput");
  voterInput.value = S.voter;
  voterInput.addEventListener("input", () => (voterInput.value = voterInput.value.replace(/\D/g, "")));
  $("#idForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = voterInput.value.replace(/\D/g, "");
    if (!v) return voterInput.focus();
    if (v !== S.voter) { S.voter = v; S.sent = false; save(); refresh(); }
    $("#games").scrollIntoView({ behavior: "smooth" });
  });

  // ---------- cards ----------
  const pips = (n) => [0, 1, 2].map((i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
  const dominant = (v) => ["grind", "story", "chill"].reduce((a, b) => (v[b] > v[a] ? b : a));

  $("#cards").innerHTML = GAMES.map((g, i) => `
    <article class="card" data-id="${g.id}" data-vibe="${dominant(g.vibe)}">
      <div class="media">
        <img class="hero-img" src="${img(g)}" alt="" loading="lazy">
        <div class="shade"></div>
        <span class="idx">${String(i + 1).padStart(2, "0")}</span>
        ${g.badge ? `<span class="badge">${g.badge}</span>` : ""}
        <img class="logo" src="${logo(g)}" alt="${g.name}" data-name="${g.name}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'logo-text',textContent:this.dataset.name}))">
        <button class="play" data-yt="${g.yt}"><i></i>Trailer</button>
        <div class="stamp s-up">HYPE</div>
        <div class="stamp s-down">NOPE</div>
      </div>
      <div class="body">
        <p class="tagline">${g.tagline}</p>
        <p class="text">${g.text}</p>
        ${g.twist ? `<ul class="twist">${g.twist.map((t) => `<li>${t}</li>`).join("")}</ul>` : ""}
        <ul class="tags">${g.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
        <div class="foot">
          <div class="vibe">
            <span>GRIND</span><div class="pips g">${pips(g.vibe.grind)}</div>
            <span>STORY</span><div class="pips s">${pips(g.vibe.story)}</div>
            <span>CHILL</span><div class="pips c">${pips(g.vibe.chill)}</div>
          </div>
          <div class="vote">
            ${g.steam ? `<a class="steam" href="https://store.steampowered.com/app/${g.steam}" target="_blank" rel="noopener">STEAM ↗</a>` : ""}
            <button class="v up" data-dir="1" aria-label="Daumen hoch für ${g.name}">${THUMB}</button>
            <button class="v down" data-dir="-1" aria-label="Daumen runter für ${g.name}">${THUMB_DOWN}</button>
          </div>
        </div>
      </div>
    </article>`).join("");

  const paintCard = (card) => {
    const v = S.votes[card.dataset.id] || 0;
    card.classList.toggle("up", v === 1);
    card.classList.toggle("down", v === -1);
  };
  document.querySelectorAll(".card").forEach(paintCard);

  $("#cards").addEventListener("click", (e) => {
    const play = e.target.closest(".play");
    if (play) return openTrailer(play.dataset.yt);
    const btn = e.target.closest(".v");
    if (!btn) return;
    const card = btn.closest(".card");
    const id = card.dataset.id, dir = +btn.dataset.dir;
    S.votes[id] = S.votes[id] === dir ? 0 : dir;
    if (S.votes[id]) burst(btn, dir === 1 ? ["#c6ff3d", "#2ef2ff", "#fff"] : ["#ff2e6e", "#ff8a1f", "#fff"], 16, 90);
    paintCard(card);
    save();
    refresh();
  });

  // reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: .12 });
  document.querySelectorAll(".card").forEach((c) => io.observe(c));

  // tilt (nur Maus)
  if (matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".card").forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 6 + "deg");
        c.style.setProperty("--rx", ((e.clientY - r.top) / r.height - .5) * -6 + "deg");
      });
      c.addEventListener("pointerleave", () => { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
    });
  }

  // ---------- particles ----------
  function burst(el, colors, n, dist) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      const a = Math.random() * Math.PI * 2, d = dist * (.4 + Math.random());
      p.className = "particle";
      p.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${colors[i % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--r:${Math.random() * 540}deg`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  // ---------- ranking ----------
  const autoOrder = () => GAMES.map((g) => g.id).sort((a, b) => (S.votes[b] || 0) - (S.votes[a] || 0));
  const currentOrder = () => {
    if (!S.manual) return autoOrder();
    const known = S.order.filter((id) => byId[id]);
    return known.concat(GAMES.map((g) => g.id).filter((id) => !known.includes(id)));
  };

  const rankEl = $("#rank");
  function renderRank() {
    rankEl.innerHTML = currentOrder().map((id, i) => {
      const g = byId[id], v = S.votes[id] || 0;
      return `<li class="r-item" data-id="${id}">
        <span class="r-num">${i + 1}</span>
        <img class="r-img" src="${img(g)}" alt="" loading="lazy">
        <span class="r-name">${g.name}</span>
        <span class="r-vote ${v === 1 ? "up" : v === -1 ? "down" : ""}">${v === 1 ? THUMB : v === -1 ? THUMB_DOWN : ""}</span>
        <span class="r-handle" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      </li>`;
    }).join("");
  }
  const renumber = () => rankEl.querySelectorAll(".r-num").forEach((n, i) => (n.textContent = i + 1));

  // falls CDN nicht lädt: Seite läuft weiter, Ranking = Vote-Reihenfolge
  if (window.Sortable) Sortable.create(rankEl, {
    animation: 220,
    ghostClass: "r-ghost",
    chosenClass: "r-chosen",
    delay: 120,
    delayOnTouchOnly: true,
    onEnd() {
      S.order = [...rankEl.children].map((li) => li.dataset.id);
      S.manual = true;
      save();
      renumber();
    },
  });

  $("#resort").addEventListener("click", () => {
    S.manual = false; S.order = []; save(); renderRank();
  });

  // ---------- HUD + submit ----------
  const hud = $("#hud"), submit = $("#submit");
  const votedCount = () => GAMES.filter((g) => S.votes[g.id]).length;

  function refresh() {
    const n = votedCount(), all = GAMES.length, done = n === all;
    $("#hudFill").style.width = (n / all) * 100 + "%";
    $("#hudText").textContent = done ? "Alle bewertet ✓" : `${n}/${all} bewertet`;
    hud.classList.toggle("complete", done);
    renderRank();
    submit.className = "submit";
    if (!S.voter) {
      submit.classList.add("locked");
      submit.textContent = "Zuerst deine Zahl eingeben ↑";
    } else if (S.sent) {
      submit.classList.add("done");
      submit.textContent = "✓ Gesendet · nochmal senden";
    } else {
      submit.textContent = "Ranking abschicken →";
    }
  }

  const onScroll = () => {
    const y = scrollY, h = innerHeight;
    const rankTop = $("#ranking").getBoundingClientRect().top;
    hud.classList.toggle("show", y > h * .6 && rankTop > h * .6);
  };
  addEventListener("scroll", onScroll, { passive: true });

  // String-Body = text/plain → kein CORS-Preflight, Apps Script liefert JSON zurück
  async function post(data) {
    if (!CONFIG.endpoint) throw new Error("no endpoint");
    const res = await fetch(CONFIG.endpoint, { method: "POST", body: JSON.stringify(data) });
    return res.json();
  }

  submit.addEventListener("click", async () => {
    if (!S.voter) {
      $(".hero").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => voterInput.focus({ preventScroll: true }), 600);
      return toast("Zuerst deine geheime Zahl eingeben", true);
    }
    if (!CONFIG.endpoint) return toast("Noch kein Endpoint eingerichtet (data.js → CONFIG.endpoint)", true);
    submit.classList.add("busy");
    submit.textContent = "Sende…";
    const order = currentOrder();
    try {
      const r = await post({
        type: "vote",
        voter: S.voter,
        votes: GAMES.map((g) => ({ game: g.name, vote: S.votes[g.id] || 0, rank: order.indexOf(g.id) + 1 })),
      });
      if (!r.ok) throw new Error(r.error);
      S.sent = true; save();
      burst(submit, ["#c6ff3d", "#2ef2ff", "#a46bff", "#ff2e6e", "#fff"], 70, 260);
      toast("Drin! Danke fürs Voten 🎮");
    } catch {
      toast("Senden fehlgeschlagen. Internet? Nochmal probieren.", true);
    }
    refresh();
  });

  // ---------- ideas (Liste kommt live aus dem Sheet) ----------
  const ideaList = $("#ideaList");
  let ideas = null, adminPw = "";

  function renderIdeas(msg) {
    ideaList.innerHTML = "";
    if (msg || !ideas.length) {
      ideaList.innerHTML = `<li class="empty"></li>`;
      ideaList.firstChild.textContent = msg || "Noch leer. Hau was rein ↓";
      return;
    }
    ideas.forEach((idea, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="mono">${String(i + 1).padStart(2, "0")}</span>`;
      li.append(idea.name);
      if (adminPw) {
        const del = document.createElement("button");
        del.className = "idea-del";
        del.textContent = "✕";
        del.setAttribute("aria-label", "Löschen");
        del.dataset.id = idea.id;
        li.append(del);
      }
      ideaList.append(li);
    });
  }

  async function loadIdeas() {
    if (!CONFIG.endpoint) return renderIdeas("Noch kein Endpoint eingerichtet.");
    renderIdeas("Lädt…");
    try {
      const r = await (await fetch(CONFIG.endpoint)).json();
      ideas = r.ideas || [];
      renderIdeas();
    } catch {
      renderIdeas("Ideen konnten nicht geladen werden.");
    }
  }

  $("#ideaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#ideaInput"), name = input.value.trim();
    if (!name) return;
    if (!CONFIG.endpoint) return toast("Noch kein Endpoint eingerichtet (data.js → CONFIG.endpoint)", true);
    try {
      const r = await post({ type: "idea", idea: name });
      if (!r.ok) throw new Error(r.error);
      ideas = r.ideas; renderIdeas();
      input.value = "";
      burst(e.submitter || input, ["#c6ff3d", "#fff"], 12, 70);
      toast("Idee geschickt 💡");
    } catch {
      toast("Senden fehlgeschlagen.", true);
    }
  });

  // ---------- admin (Passwort wird nur im Apps Script geprüft) ----------
  $("#adminLink").addEventListener("click", () => {
    const f = $("#adminForm");
    f.hidden = false;
    f.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => $("#adminPw").focus({ preventScroll: true }), 500);
  });
  $("#adminForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = $("#adminPw").value;
    if (!pw) return;
    try {
      const r = await post({ type: "admin", pw });
      if (!r.ok) return toast("Falsches Passwort", true);
      adminPw = pw;
      $("#adminForm").hidden = true;
      toast("Admin-Modus: ✕ zum Löschen");
      if (ideas) renderIdeas();
    } catch {
      toast("Login fehlgeschlagen.", true);
    }
  });
  ideaList.addEventListener("click", async (e) => {
    const del = e.target.closest(".idea-del");
    if (!del || !adminPw) return;
    del.disabled = true;
    try {
      const r = await post({ type: "deleteIdea", pw: adminPw, id: del.dataset.id });
      if (!r.ok) throw new Error(r.error);
      ideas = r.ideas; renderIdeas();
      toast("Gelöscht");
    } catch {
      del.disabled = false;
      toast("Löschen fehlgeschlagen.", true);
    }
  });

  // ---------- trailer modal ----------
  const modal = $("#modal"), frame = $("#modalFrame");
  function openTrailer(id) {
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Trailer"></iframe>`;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeTrailer() {
    modal.hidden = true; frame.innerHTML = ""; document.body.style.overflow = "";
  }
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest(".modal-x")) closeTrailer(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeTrailer(); });

  // ---------- toast ----------
  let tt;
  function toast(msg, err) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (err ? " err" : "");
    clearTimeout(tt);
    tt = setTimeout(() => (t.className = "toast" + (err ? " err" : "")), 3200);
  }

  loadIdeas();
  refresh();
  onScroll();
})();
