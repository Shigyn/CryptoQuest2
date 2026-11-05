(function () {
  const cfg = window.FAUCET_CONFIG;
  const TK = cfg.TOKEN;
  const lang = (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
  const FR = lang === "fr";
  document.documentElement.lang = lang;
  document.title = cfg.SITE_NAME;

  // Textes : [francais, anglais]
  const W = {
    gateSub: ["Retraits instantanés · Réclame toutes les 5 min", "Instant withdrawals · Claim every 5 min"],
    fpField: ["Ton e-mail, pseudo ou adresse FaucetPay", "Your FaucetPay email, username or address"],
    enter: ["Entrer et jouer", "Enter and play"],
    passwordShort: ["Mot de passe", "Password"],
    passwordAsk: ["Ce compte est protégé par un mot de passe.", "This account is protected by a password."],
    noFp: ["Pas de compte FaucetPay ?", "No FaucetPay account?"], createFp: ["Créer un compte gratuit", "Create a free account"],
    chipInstant: ["Retrait instantané", "Instant withdrawal"], chipFree: ["100 % gratuit", "100% free"], chipJackpot: ["Jackpot 1 €", "€1 jackpot"],
    home: ["Accueil", "Home"], earn: ["Gagner", "Earn"], games: ["Jeux", "Games"], wallet: ["Portefeuille", "Wallet"], profile: ["Profil", "Profile"],
    balance: ["Solde", "Balance"], claims: ["Tirages", "Rolls"], streak: ["Série", "Streak"], level: ["Niveau", "Level"],
    days: ["jours", "days"], today: ["aujourd'hui", "today"], toNext: ["avant le niveau", "to level"],
    payout: ["Table des gains", "Payout table"], jackpot: ["Jackpot", "Jackpot"],
    roll: ["Tirage", "Roll"], rollBtn: ["Lancer le tirage", "Roll now"], next: ["Prochain tirage dans", "Next roll in"],
    rolling: ["Tirage en cours…", "Rolling…"], closed: ["Faucet fermé", "Faucet closed"],
    won: ["gagnés !", "won!"], free: ["Gratuit, sans mise. Le serveur tire un nombre de 0 à 99 999.", "Free, no stake. The server draws a number from 0 to 99,999."],
    ptc: ["Pubs", "Ads"], links: ["Liens", "Links"], offers: ["Offres", "Offers"],
    pendingNote: ["Ces gains sont vérifiés, puis partent seuls sur FaucetPay au paiement de chaque heure.", "These earnings are reviewed, then sent to FaucetPay automatically every hour."],
    noPtc: ["Aucune pub pour le moment. Reviens plus tard.", "No ads right now. Come back later."],
    noLinks: ["Aucun lien pour le moment. Reviens plus tard.", "No links right now. Come back later."],
    noOffers: ["Aucune offre pour le moment. Reviens plus tard.", "No offers right now. Come back later."],
    view: ["Voir", "View"], watch: ["Reste encore", "Stay"], confirm: ["Valider", "Confirm"], open: ["Ouvrir", "Open"], left: ["restants", "left"],
    credited: ["ajoutés, en attente de validation.", "added, under review."],
    wheel: ["Roue du jour", "Daily wheel"], wheelText: ["Un tour gratuit par jour, après ton premier tirage.", "One free spin a day, after your first roll."],
    spin: ["Tourner la roue", "Spin the wheel"], spun: ["Reviens demain", "Come back tomorrow"], wheelWon: ["gagnés à la roue !", "won on the wheel!"],
    bonus: ["Bonus quotidien", "Daily bonus"], bonusText: ["Fais un tirage, puis récupère ton bonus.", "Make a roll, then collect your bonus."],
    collect: ["Récupérer", "Collect"], done: ["Récupéré", "Collected"],
    quests: ["Quêtes du jour", "Daily quests"], rolls: ["tirages", "rolls"],
    available: ["Disponible", "Available"], pending: ["À valider", "Under review"], validated: ["Validé", "Approved"],
    withdrawNow: ["Retirer maintenant", "Withdraw now"], receiveIn: ["Recevoir en", "Receive in"], sentTo: ["Envoyé vers", "Sent to"],
    wdDelay: ["Le paiement peut mettre une à deux minutes à apparaître sur ton compte FaucetPay.", "The payment can take one to two minutes to show on your FaucetPay account."],
    wdDone: ["envoyés sur FaucetPay · paiement n°", "sent to FaucetPay · payout #"], wdValidated: ["partiront au prochain paiement horaire.", "will be sent with the next hourly payout."],
    withdrawals: ["Retraits", "Withdrawals"], activity: ["Activité", "Activity"], noWd: ["Aucun retrait pour le moment.", "No withdrawals yet."], noHistory: ["Aucun mouvement. Fais ton premier tirage !", "No activity yet. Make your first roll!"],
    worth: ["soit", "worth"], rate: ["10 000 CC = 1 €", "10,000 CC = €1"],
    referral: ["Parrainage", "Referrals"], refText: ["de tout ce que gagnent tes filleuls te revient.", "of everything your referrals earn goes to you."],
    refLink: ["Ton lien", "Your link"], copy: ["Copier", "Copy"], copied: ["Lien copié.", "Link copied."], refCount: ["filleuls", "referrals"], refEarned: ["gagnés grâce à eux", "earned from them"],
    security: ["Sécurité", "Security"], secOn: ["Ton compte est protégé par un mot de passe.", "Your account is protected by a password."],
    secOff: ["Sans mot de passe, ton adresse FaucetPay suffit pour entrer. Ajoute-en un pour protéger ton compte.", "Without a password, your FaucetPay address is enough to enter. Add one to protect your account."],
    secNew: ["Nouveau mot de passe (8 caractères minimum)", "New password (8 characters minimum)"], secSave: ["Protéger mon compte", "Protect my account"], secChange: ["Changer le mot de passe", "Change password"], secDone: ["Mot de passe enregistré.", "Password saved."],
    logout: ["Déconnexion", "Log out"], legal: ["Mentions et confidentialité", "Legal and privacy"],
    st_paid: ["Payé", "Paid"], st_failed: ["Refusé", "Refused"], st_unknown: ["En vérification", "Checking"], st_reserved: ["En cours", "Processing"],
    offline: ["Le site ne répond pas. Vérifie ta connexion et réessaie.", "The site isn't responding. Check your connection and try again."],
    needCaptcha: ["Valide le captcha, puis appuie de nouveau.", "Complete the captcha, then press again."],
    paused: ["Le site est en pause. Tes CryptoCoin restent sur ton compte.", "The site is paused. Your CryptoCoin stay on your account."],
  };
  const t = (k) => (W[k] ? W[k][FR ? 0 : 1] : k);

  const ERR = {
    captcha: ["Le captcha a échoué. Valide-le de nouveau.", "The captcha failed. Complete it again."],
    invalid_address: ["FaucetPay ne connaît pas ce compte. Vérifie ton identifiant.", "FaucetPay doesn't know this account. Check your ID."],
    weak_password: ["Choisis un mot de passe d'au moins 8 caractères.", "Choose a password of at least 8 characters."],
    password_required: ["Ce compte est protégé : saisis ton mot de passe.", "This account is protected: enter your password."],
    bad_password: ["Mot de passe incorrect.", "Wrong password."],
    locked: ["Trop d'essais. Réessaie dans 15 minutes.", "Too many attempts. Try again in 15 minutes."],
    too_many_signups: ["Trop de comptes créés depuis cette connexion. Réessaie demain.", "Too many accounts from this connection. Try again tomorrow."],
    cooldown: ["Patiente jusqu'à la fin du compte à rebours.", "Wait until the countdown ends."],
    daily_limit: ["Limite du jour atteinte. Reviens demain.", "Daily limit reached. Come back tomorrow."],
    banned: ["Ce compte ne peut plus jouer ici.", "This account can no longer play here."],
    paused: W.paused,
    coin_empty: ["Le solde de cette crypto est vide. Tes CryptoCoin sont intacts.", "This coin has run dry. Your CryptoCoin are safe."],
    coin_unavailable: ["Cette crypto n'est plus disponible. Choisis-en une autre.", "This coin is no longer available. Pick another."],
    nothing_to_withdraw: ["Tu n'as rien à retirer pour le moment.", "Nothing to withdraw right now."],
    amount_too_small: ["Montant trop petit pour cette crypto. Choisis USDT ou gagne encore un peu.", "Amount too small for this coin. Pick USDT or earn a bit more."],
    pending: ["FaucetPay n'a pas encore confirmé. Vérifie ton compte dans quelques minutes.", "FaucetPay hasn't confirmed yet. Check your account in a few minutes."],
    try_later: ["Le service est occupé. Réessaie dans une minute.", "The service is busy. Try again in a minute."],
    already_done: ["Déjà fait aujourd'hui.", "Already done today."],
    not_reached: ["Objectif pas encore atteint.", "Goal not reached yet."],
    too_soon: ["Reste encore quelques secondes sur la page.", "Stay on the page a few more seconds."],
    not_found: ["Plus disponible.", "No longer available."],
    unauthorized: ["Ta session a expiré. Reconnecte-toi.", "Your session expired. Log in again."],
  };
  const message = (r) => (r.code === "offline" ? t("offline") : (ERR[r.code] || ERR.try_later)[FR ? 0 : 1]);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* navigation privee */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* navigation privee */ } },
  };

  function h(tag, props, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k in node && k !== "list") node[k] = v;
      else node.setAttribute(k, v);
    }
    node.append(...kids.flat().filter((c) => c !== null && c !== undefined && c !== false));
    return node;
  }

  const PATHS = {
    home: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    earn: "M13 2 4 14h7l-1 8 9-12h-7z",
    games: "M6 12h4M8 10v4M15 11h.01M18 13h.01M7 6h10a5 5 0 0 1 4.9 6l-.8 4A3 3 0 0 1 16 17l-1-1H9l-1 1a3 3 0 0 1-5.1-1l-.8-4A5 5 0 0 1 7 6z",
    wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zm14 7h.01",
    profile: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
    mail: "M4 6h16v12H4zM4 7l8 6 8-6",
    lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
    bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
    fire: "M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-2-6-1 4-4 7-4 12a7 7 0 0 0 7 7z",
    star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    link: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1m2 4a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
    gift: "M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7S10 3 7.5 3 6 6 12 7zm0 0s2-4 4.5-4S18 6 12 7z",
    flag: "M5 21V4m0 0h12l-2 4 2 4H5",
    check: "M5 12l5 5L20 7",
  };
  function icon(name) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = `<path d="${PATHS[name]}"/>`;
    return s;
  }
  // Piece CryptoCoin
  function coin(cls = "coin") {
    const w = h("span", { style: "display:inline-flex" });
    w.innerHTML = `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd0ff"/><stop offset="1" stop-color="#2f6bff"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="url(#cg)"/><circle cx="32" cy="32" r="23" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/><path d="M40 24.5a10 10 0 1 0 0 15" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`;
    return w.firstChild;
  }

  // Serveur ----------------------------------------------------------------
  let session = store.get("cc.session");
  let status = null;
  let me = null;

  async function api(action, body = {}) {
    let res, data;
    try {
      res = await fetch(`${cfg.API_BASE}/api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, session, ...body }),
      });
      data = await res.json();
    } catch {
      return { ok: false, code: "offline" };
    }
    if (res.status === 401 && data.code === "unauthorized" && session) {
      session = null;
      me = null;
      store.del("cc.session");
      render();
    }
    return data;
  }

  // Captcha : un widget par bloc
  const captchaState = new WeakMap();
  let turnstileReady = null;
  function loadTurnstile() {
    if (turnstileReady) return turnstileReady;
    turnstileReady = new Promise((resolve) => {
      window.onTurnstileReady = () => resolve(window.turnstile);
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady";
      s.async = true;
      document.head.append(s);
    });
    return turnstileReady;
  }
  function captchaBox() {
    const box = h("div", { class: "captcha" });
    const state = { token: "", widget: null };
    captchaState.set(box, state);
    if (cfg.TURNSTILE_SITE_KEY) {
      loadTurnstile().then((ts) => {
        if (!box.isConnected) return;
        state.widget = ts.render(box, {
          sitekey: cfg.TURNSTILE_SITE_KEY, language: lang, theme: "dark",
          callback: (tok) => { state.token = tok; },
          "expired-callback": () => { state.token = ""; },
          "error-callback": () => { state.token = ""; },
        });
      });
    }
    return box;
  }
  const captchaToken = (box) => captchaState.get(box)?.token || "";
  const captchaMissing = (box) => Boolean(cfg.TURNSTILE_SITE_KEY) && !captchaToken(box);
  function captchaReset(box) {
    const s = captchaState.get(box);
    if (!s) return;
    s.token = "";
    if (window.turnstile && s.widget !== null) window.turnstile.reset(s.widget);
  }

  // Mise en forme
  const locale = FR ? "fr-FR" : "en-US";
  const fmtInt = (n) => Number(n).toLocaleString(locale);
  const tk = (n) => `${fmtInt(n)} ${TK}`;
  const eur = (tokens) => {
    const v = tokens / (status?.tokens_per_eur || 10000);
    return v.toLocaleString(locale, { minimumFractionDigits: v < 0.01 ? 4 : 2, maximumFractionDigits: 4 }) + " €";
  };
  const units = (u, d) => (u / 10 ** d).toFixed(d).replace(/\.?0+$/, "");
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const when = (iso) => new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
  const shortAddr = (a) => (a && a.length > 22 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a || "");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Niveau : 20 CC pour le niveau 2, 80 pour le 3, 180 pour le 4…
  function levelOf(earned) {
    const lvl = Math.floor(Math.sqrt(Math.max(0, earned) / 20)) + 1;
    const from = 20 * (lvl - 1) ** 2;
    const to = 20 * lvl ** 2;
    return { lvl, pct: Math.min(100, ((earned - from) / (to - from)) * 100), left: to - earned };
  }

  let toastTimer = null;
  function toast(text, kind = "info") {
    document.querySelector(".toast")?.remove();
    const el = h("div", { class: `notice toast ${kind}`, role: "status" }, text);
    document.body.append(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 5000);
  }

  // Gain : +N qui monte et pieces qui jaillissent depuis le bouton.
  function burst(fromEl, text) {
    if (reduceMotion || !fromEl) return;
    const r = fromEl.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top;
    const b = h("div", { class: "burst", style: `left:${x}px;top:${y}px` }, text);
    document.body.append(b);
    setTimeout(() => b.remove(), 1500);
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      const s = h("div", { class: "spark", style: `left:${x - 7}px;top:${y + 10}px;--dx:${Math.cos(a) * 90}px;--dy:${Math.sin(a) * 70 - 40}px` });
      document.body.append(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  const adSlot = (slot) => {
    const html = cfg.ADS?.[slot];
    if (!html) return null;
    const box = h("div", { class: "ad" });
    // createContextualFragment execute les scripts du reseau publicitaire.
    box.append(document.createRange().createContextualFragment(html));
    return box;
  };

  // Fond : reseau de points relies, en pause quand l'onglet est cache.
  function background() {
    if (document.querySelector(".bg")) return;
    const layer = h("div", { class: "bg", "aria-hidden": "true" });
    const canvas = h("canvas", {});
    layer.append(canvas);
    document.body.prepend(layer);
    if (reduceMotion) return;
    const ctx = canvas.getContext("2d");
    let w = 0, ht = 0, dpr = 1, pts = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      ht = canvas.height = innerHeight * dpr;
      const n = Math.round(Math.min(80, (innerWidth * innerHeight) / 18000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * ht, vx: (Math.random() - 0.5) * 0.3 * dpr, vy: (Math.random() - 0.5) * 0.3 * dpr }));
    };
    resize();
    addEventListener("resize", resize);
    const link = 140 * dpr;
    const frame = () => {
      if (!document.hidden) {
        ctx.clearRect(0, 0, w, ht);
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > ht) p.vy *= -1;
        }
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = `rgba(70, 150, 255, ${0.3 * (1 - d / link)})`;
            ctx.lineWidth = dpr;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(110, 200, 255, .85)";
        for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.7 * dpr, 0, Math.PI * 2); ctx.fill(); }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function ticker() {
    const list = status?.recent || [];
    if (!list.length) return null;
    const items = list.map((r) => h("span", { class: "ticker-item" }, r.who, h("b", {}, `+${units(r.amount_units, r.decimals)} ${r.coin}`)));
    // Contenu double pour un defilement sans coupure.
    return h("div", { class: "ticker", "aria-label": FR ? "Derniers paiements" : "Latest payouts" },
      h("span", { class: "ticker-live" }, "LIVE"),
      h("div", { class: "ticker-track" }, items, items.map((n) => n.cloneNode(true))));
  }

  // Ecran d'entree ---------------------------------------------------------
  function gate() {
    const address = h("input", { autocomplete: "username", autocapitalize: "off", spellcheck: false, maxLength: 128, required: true, placeholder: "toi@exemple.com", value: store.get("cc.address") || "", ariaLabel: t("fpField") });
    const pass = h("input", { type: "password", autocomplete: "current-password", ariaLabel: t("passwordShort"), placeholder: t("passwordShort") });
    const passWrap = h("div", { class: "input", hidden: true, style: "margin-top:10px" }, icon("lock"), pass);
    const msg = h("div", { role: "alert", style: "margin-top:12px" });
    const submit = h("button", { class: "btn big", type: "submit", style: "margin-top:14px" }, t("enter"));
    const form = h("form", {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        submit.disabled = true;
        const r = await api("login", { address: address.value, password: passWrap.hidden ? undefined : pass.value, ref: store.get("cc.ref") });
        submit.disabled = false;
        if (r.ok) {
          store.set("cc.address", address.value.trim());
          session = r.session;
          store.set("cc.session", session);
          location.hash = "";
          await boot();
        } else if (r.code === "password_required") {
          passWrap.hidden = false;
          msg.replaceChildren(h("div", { class: "notice info" }, t("passwordAsk")));
          pass.focus();
        } else {
          msg.replaceChildren(h("div", { class: "notice bad" }, message(r)));
        }
      },
    }, h("div", { class: "input" }, icon("mail"), address), passWrap, submit, msg);

    return h("div", {},
      ticker(),
      h("main", { class: "gate" },
        h("section", { class: "gate-card" },
          coin("coin coin-big"),
          h("h1", {}, cfg.SITE_NAME),
          h("p", { class: "gate-sub" }, t("gateSub")),
          !status ? h("div", { class: "notice bad", style: "margin-bottom:14px" }, t("offline")) : null,
          status?.paused ? h("div", { class: "notice warn", style: "margin-bottom:14px" }, t("paused")) : null,
          form,
          h("p", { class: "gate-foot" }, `${t("noFp")} `, h("a", { href: "https://faucetpay.io", rel: "noopener", target: "_blank" }, t("createFp"))),
          h("div", { class: "chips" },
            h("span", { class: "chip" }, icon("bolt"), t("chipInstant")),
            h("span", { class: "chip" }, icon("gift"), t("chipFree")),
            h("span", { class: "chip" }, icon("star"), t("chipJackpot"))))));
  }

  // Application ------------------------------------------------------------
  const TABS = [["", "home"], ["earn", "earn"], ["games", "games"], ["wallet", "wallet"], ["profile", "profile"]];
  const routeNow = () => {
    const r = location.hash.replace("#", "");
    return TABS.some(([k]) => k === r) ? r : "";
  };
  let earnTab = "ptc";
  let walletTab = "withdrawals";
  let earn = null;
  let timers = [];
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };

  async function refreshMe() {
    const r = await api("me");
    if (r.ok) { me = r; updateHeader(); }
    return r;
  }

  let header = null;
  function updateHeader() {
    if (!header || !me) return;
    const lv = levelOf(me.earned_total || 0);
    header.replaceChildren(
      h("div", { class: "who" },
        h("div", { class: "avatar" }, (me.fp_address || "?").slice(0, 1).toUpperCase(), h("span", { class: "lvl" }, String(lv.lvl))),
        h("div", { class: "who-text" },
          h("div", { class: "who-name" }, shortAddr(me.fp_address)),
          h("div", { class: "xp", title: `${tk(lv.left)} ${t("toNext")} ${lv.lvl + 1}` }, h("i", { style: `width:${lv.pct}%` })))),
      h("div", { class: "coin-pill" }, coin(), fmtInt(me.available)));
  }

  function stat(ico, cls, label, value, sub) {
    return h("div", { class: "stat" },
      h("div", { class: `stat-ico ${cls}` }, icon(ico)),
      h("div", { class: "stat-label" }, label),
      h("div", { class: "stat-value" }, value),
      sub ? h("div", { class: "stat-sub" }, sub) : null);
  }

  function statsRow() {
    const lv = levelOf(me.earned_total || 0);
    return h("section", { class: "stats" },
      stat("wallet", "", t("balance"), tk(me.available), `${t("worth")} ${eur(me.available)}`),
      stat("bolt", "green", t("claims"), `${me.claims_today}/${me.claims_max}`, t("today")),
      stat("fire", "fire", t("streak"), `${me.streak}`, t("days")),
      stat("star", "gold", t("level"), `${lv.lvl}`, `${tk(lv.left)} ${t("toNext")} ${lv.lvl + 1}`));
  }

  // Tirage du faucet
  function rows() {
    const base = status?.faucet_reward_tokens ?? 0;
    const tiers = [...(status?.roll_tiers || [])].sort((a, b) => a.from - b.from);
    const out = [];
    let start = 0;
    let reward = base;
    for (const tier of tiers) {
      if (tier.from > start) out.push({ from: start, to: tier.from - 1, tokens: reward });
      start = tier.from;
      reward = tier.tokens;
    }
    out.push({ from: start, to: 99999, tokens: reward });
    return out;
  }

  let statsHost = null;
  function rollCard() {
    const table = rows();
    const max = Math.max(...table.map((r) => r.tokens));
    const rowEls = table.map((r) => h("div", { class: `payout-row${r.tokens === max && table.length > 1 ? " jackpot" : ""}` },
      h("span", {}, r.from === r.to ? `${fmtInt(r.from)} · ${t("jackpot")}` : `${fmtInt(r.from)} – ${fmtInt(r.to)}`),
      h("b", {}, tk(r.tokens))));
    const digits = h("div", { class: "roll-digits", "aria-live": "polite" }, "00000");
    const fill = h("i", {});
    const cap = captchaBox();
    const btn = h("button", { class: "btn big", type: "button" });
    const cooldown = status?.cooldown_seconds ?? 300;
    let readyAt = Date.now() + (me.retry_after || 0) * 1000;
    let busy = false;

    const tick = () => {
      const left = Math.ceil((readyAt - Date.now()) / 1000);
      fill.style.width = `${left > 0 ? (1 - left / cooldown) * 100 : 100}%`;
      if (busy) return;
      if (status?.paused) { btn.disabled = true; btn.textContent = t("closed"); }
      else if (left > 0) { btn.disabled = true; btn.textContent = `${t("next")} ${clock(left)}`; }
      else { btn.disabled = false; btn.textContent = t("rollBtn"); }
    };
    tick();
    every(tick, 1000);

    const animateTo = (target) => new Promise((resolve) => {
      if (reduceMotion) { digits.textContent = String(target).padStart(5, "0"); resolve(); return; }
      digits.classList.add("spinning");
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / 1300);
        digits.textContent = p < 1 ? String(Math.floor(Math.random() * 100000)).padStart(5, "0") : String(target).padStart(5, "0");
        if (p < 1) requestAnimationFrame(step);
        else { digits.classList.remove("spinning"); resolve(); }
      };
      requestAnimationFrame(step);
    });

    btn.onclick = async () => {
      if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
      busy = true;
      btn.disabled = true;
      btn.textContent = t("rolling");
      rowEls.forEach((el) => el.classList.remove("hit"));
      const r = await api("claim", { captcha: captchaToken(cap) || "dev" });
      captchaReset(cap);
      if (r.ok) {
        await animateTo(r.roll ?? 0);
        const i = table.findIndex((row) => r.roll >= row.from && r.roll <= row.to);
        if (i >= 0) rowEls[i].classList.add("hit");
        readyAt = Date.now() + r.cooldown_seconds * 1000;
        burst(btn, `+${tk(r.tokens)}`);
        toast(`${tk(r.tokens)} ${t("won")}`, "good");
        await refreshMe();
        statsHost?.replaceChildren(statsRow());
      } else {
        if (r.retry_after) readyAt = Date.now() + r.retry_after * 1000;
        toast(message(r), "bad");
      }
      busy = false;
      tick();
    };

    return h("div", { class: "grid2 roll-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-title" }, t("payout"), h("span", {}, TK)), rowEls),
      h("section", { class: "panel" },
        h("div", { class: "roll" }, h("div", { class: "roll-label" }, t("roll").toUpperCase()), digits),
        h("div", { class: "cooldown" }, fill),
        cap, btn,
        h("p", { class: "note", style: "text-align:center;margin:12px 0 0" }, t("free"))));
  }

  function homeView() {
    statsHost = h("div", {}, statsRow());
    return h("div", { class: "stack" }, statsHost, rollCard(), adSlot("top"));
  }

  // Gagner : pubs, liens, offres
  async function loadEarn() {
    const r = await api("earn_list");
    if (r.ok) earn = r;
    return r;
  }

  function earnView() {
    const body = h("div", {}, h("p", { class: "empty" }, "…"));
    const seg = h("div", { class: "seg", role: "tablist" },
      [["ptc", t("ptc")], ["links", t("links")], ["offers", t("offers")]].map(([k, label]) =>
        h("button", { type: "button", role: "tab", "aria-selected": String(earnTab === k), onclick: () => { earnTab = k; render(); } }, label)));

    const ptcList = () => {
      if (!earn.ptc.length) return h("p", { class: "empty" }, t("noPtc"));
      return h("div", {}, earn.ptc.map((c) => {
        const action = h("div", {});
        const start = h("button", {
          class: "btn small",
          onclick: async () => {
            const win = window.open("about:blank", "_blank");
            const r = await api("ptc_start", { id: c.id });
            if (!r.ok) { win?.close(); toast(message(r), "bad"); return; }
            if (win) { win.opener = null; win.location = r.url; }
            let left = r.duration_seconds;
            const label = h("span", { class: "badge warn" }, `${t("watch")} ${left} s`);
            action.replaceChildren(label);
            const id = every(() => {
              left -= 1;
              if (left > 0) { label.textContent = `${t("watch")} ${left} s`; return; }
              clearInterval(id);
              const cap = captchaBox();
              const ok = h("button", {
                class: "btn small gold",
                onclick: async () => {
                  if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
                  const done = await api("ptc_complete", { id: c.id, captcha: captchaToken(cap) || "dev" });
                  captchaReset(cap);
                  if (done.ok) burst(ok, `+${tk(done.tokens)}`);
                  toast(done.ok ? `${tk(done.tokens)} ${t("credited")}` : message(done), done.ok ? "good" : "bad");
                  if (done.ok || done.code === "already_done") { await loadEarn(); await refreshMe(); draw(); }
                },
              }, t("confirm"));
              action.replaceChildren(h("div", {}, cap, ok));
            }, 1000);
          },
        }, t("view"));
        action.append(start);
        return h("div", { class: "row" },
          h("div", { class: "row-ico" }, icon("eye")),
          h("div", { class: "row-main" }, h("h3", {}, c.title), h("div", { class: "row-sub" }, `${c.duration_seconds} s · `, h("span", { class: "reward" }, coin(), fmtInt(c.reward_tokens)))),
          action);
      }));
    };

    const linksList = () => {
      if (!earn.shortlinks.length) return h("p", { class: "empty" }, t("noLinks"));
      const cap = captchaBox();
      return h("div", {}, cap, earn.shortlinks.map((p) => h("div", { class: "row" },
        h("div", { class: "row-ico" }, icon("link")),
        h("div", { class: "row-main" }, h("h3", {}, p.name), h("div", { class: "row-sub" }, `${p.remaining} ${t("left")} · `, h("span", { class: "reward" }, coin(), fmtInt(p.reward_tokens)))),
        h("button", {
          class: "btn small", disabled: p.remaining < 1,
          onclick: async () => {
            if (captchaMissing(cap)) { toast(t("needCaptcha"), "bad"); return; }
            const r = await api("shortlink_start", { id: p.id, captcha: captchaToken(cap) || "dev" });
            captchaReset(cap);
            if (r.ok) location.href = r.url;
            else toast(message(r), "bad");
          },
        }, t("open")))));
    };

    const offersBlock = () => {
      if (!earn.offerwalls.length) return h("p", { class: "empty" }, t("noOffers"));
      const frame = h("div", { style: "margin-top:12px" });
      const open = (w) => frame.replaceChildren(h("iframe", { class: "wall", src: w.iframe_url.replaceAll("{user}", encodeURIComponent(me.ref_code)), title: w.name }));
      open(earn.offerwalls[0]);
      return h("div", {},
        earn.offerwalls.length > 1 ? h("div", { class: "seg" }, earn.offerwalls.map((w) => h("button", { type: "button", onclick: () => open(w) }, w.name))) : null,
        frame);
    };

    const draw = () => {
      if (!earn) return;
      body.replaceChildren(h("p", { class: "note" }, t("pendingNote")),
        earnTab === "ptc" ? ptcList() : earnTab === "links" ? linksList() : offersBlock());
    };
    loadEarn().then(draw);
    return h("div", { class: "stack" }, h("section", { class: "panel" }, seg, body), adSlot("bottom"));
  }

  // Jeux : roue, bonus, quetes
  function wheelCard() {
    const prizes = me.wheel_prizes || [];
    const n = Math.max(prizes.length, 1);
    const colors = ["#2f6bff", "#29b8ff", "#13265a", "#ff9f1c"];
    const stops = prizes.map((_, i) => `${colors[i % (n % 4 === 1 && i === n - 1 ? 3 : 4)]} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`).join(", ");
    const disc = h("div", { class: "wheel-disc", style: `background:conic-gradient(${stops})` },
      prizes.map((p, i) => h("span", { class: "wheel-label", style: `transform:translate(-50%, -50%) rotate(${(i + 0.5) * 360 / n}deg) translateY(-78px)` }, String(p))));
    let turns = Number(store.get("cc.wheelTurn")) || 0;
    disc.style.transform = `rotate(${turns}deg)`;
    const btn = h("button", {
      class: "btn gold", style: "width:100%", disabled: me.wheel_done || me.claims_today < me.wheel_min_claims,
      onclick: async () => {
        btn.disabled = true;
        const r = await api("wheel");
        if (!r.ok) { toast(message(r), "bad"); btn.disabled = false; return; }
        const target = 360 - (r.index + 0.5) * 360 / n;
        turns = turns - (turns % 360) + 360 * 6 + target;
        store.set("cc.wheelTurn", String(turns % 360));
        disc.style.transition = reduceMotion ? "none" : "transform 4.2s cubic-bezier(.12,.85,.18,1)";
        disc.style.transform = `rotate(${turns}deg)`;
        setTimeout(async () => {
          burst(btn, `+${tk(r.tokens)}`);
          toast(`${tk(r.tokens)} ${t("wheelWon")}`, "good");
          await refreshMe();
          render();
        }, reduceMotion ? 50 : 4400);
      },
    }, me.wheel_done ? t("spun") : t("spin"));
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("wheel")),
      h("p", { class: "note" }, t("wheelText")),
      h("div", { class: "wheel" }, h("div", { class: "wheel-pointer" }), disc, h("div", { class: "wheel-hub" })),
      h("div", { style: "margin-top:18px" }, btn));
  }

  function bonusCard() {
    const btn = h("button", {
      class: "btn gold", style: "width:100%", disabled: me.daily_done || me.claims_today < 1,
      onclick: async (e) => {
        const target = e.currentTarget;
        const r = await api("daily");
        if (r.ok) burst(target, `+${tk(r.tokens)}`);
        toast(r.ok ? `${tk(r.tokens)} ${t("won")}` : message(r), r.ok ? "good" : "bad");
        await refreshMe();
        render();
      },
    }, me.daily_done ? t("done") : `${t("collect")} ${tk(me.daily_bonus_tokens)}`);
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("bonus")),
      h("div", { style: "display:flex;align-items:center;gap:14px;margin-bottom:14px" },
        h("div", { class: "row-ico", style: "background:rgba(255,204,61,.14);color:var(--gold)" }, icon("gift")),
        h("p", { class: "note", style: "margin:0" }, t("bonusText"))),
      btn);
  }

  function questsCard() {
    return h("section", { class: "panel" },
      h("div", { class: "panel-title" }, t("quests"), h("span", { class: "badge" }, `${me.claims_today} ${t("rolls")}`)),
      me.challenges.map((c) => {
        const pct = Math.min(100, (me.claims_today / c.target) * 100);
        const ready = me.claims_today >= c.target && !c.done;
        return h("div", { class: "row" },
          h("div", { class: "row-ico", style: c.done ? "background:rgba(49,214,138,.15);color:var(--green)" : "" }, icon(c.done ? "check" : "flag")),
          h("div", { class: "row-main" },
            h("h3", {}, FR ? c.name.replace("réclamations", "tirages") : `${c.target} ${t("rolls")} ${t("today")}`),
            h("div", { class: "progress" }, h("i", { style: `width:${pct}%` }))),
          h("button", {
            class: `btn small ${ready ? "gold" : ""}`, disabled: !ready,
            onclick: async (e) => {
              const target = e.currentTarget;
              const r = await api("challenge", { id: c.id });
              if (r.ok) burst(target, `+${tk(r.tokens)}`);
              toast(r.ok ? `${tk(r.tokens)} ${t("won")}` : message(r), r.ok ? "good" : "bad");
              await refreshMe();
              render();
            },
          }, c.done ? t("done") : h("span", { class: "reward", style: "color:inherit" }, coin(), fmtInt(c.reward_tokens))));
      }));
  }

  const gamesView = () => h("div", { class: "stack" }, h("div", { class: "grid2" }, wheelCard(), h("div", {}, bonusCard(), h("div", { style: "height:14px" }), questsCard())));

  // Portefeuille
  const SOURCE = {
    faucet: ["Tirage", "Roll"], daily: ["Bonus quotidien", "Daily bonus"], challenge: ["Quête", "Quest"], referral: ["Parrainage", "Referral"], wheel: ["Roue du jour", "Daily wheel"],
    ptc: ["Pub", "Ad"], shortlink: ["Lien", "Link"], offer: ["Offre", "Offer"], offer_reversed: ["Offre annulée", "Offer reversed"],
    validation: ["Validation", "Approval"], rejected: ["Gain refusé", "Refused"], withdrawal: ["Retrait", "Withdrawal"], withdrawal_refund: ["Retrait rendu", "Refund"],
  };
  function walletView() {
    const c = me.coins.find((x) => x.code === me.payout_coin) || me.coins[0];
    const est = c && me.available > 0 ? (me.available / (status?.tokens_per_eur || 10000)) * c.per_eur : 0;
    const btn = h("button", {
      class: "btn big", disabled: me.available <= 0 || !c || status?.paused,
      onclick: async () => {
        btn.disabled = true;
        const r = await api("withdraw");
        if (r.ok) { burst(btn, `${units(r.amount_units, r.decimals)} ${r.coin}`); toast(`${units(r.amount_units, r.decimals)} ${r.coin} ${t("wdDone")} ${r.payout_id}`, "good"); }
        else toast(message(r), r.code === "pending" ? "info" : "bad");
        await refreshMe();
        render();
      },
    }, t("withdrawNow"));
    const seg = h("div", { class: "seg", role: "tablist" }, [["withdrawals", t("withdrawals")], ["activity", t("activity")]].map(([k, label]) =>
      h("button", { type: "button", role: "tab", "aria-selected": String(walletTab === k), onclick: () => { walletTab = k; render(); } }, label)));
    const bucket = { available: t("available"), pending: t("pending"), validated: t("validated") };
    const list = walletTab === "withdrawals"
      ? (me.withdrawals.length ? me.withdrawals.map((w) => h("div", { class: "list-line" },
          h("div", {}, h("div", { class: "amount" }, `${units(w.amount_units, w.decimals)} ${w.coin}`), h("div", { class: "row-sub" }, when(w.at))),
          h("span", { class: `badge ${w.status === "paid" ? "good" : w.status === "failed" ? "bad" : "warn"}` }, t(`st_${w.status}`))))
        : h("p", { class: "empty" }, t("noWd")))
      : (me.history.length ? me.history.map((r) => h("div", { class: "list-line" },
          h("div", {}, h("div", { style: "color:var(--ink);font-weight:600" }, (SOURCE[r.source] || [r.source, r.source])[FR ? 0 : 1]), h("div", { class: "row-sub" }, `${when(r.at)} · ${bucket[r.bucket]}`)),
          h("span", { class: `amount ${r.delta > 0 ? "plus" : "minus"}` }, `${r.delta > 0 ? "+" : ""}${fmtInt(r.delta)}`)))
        : h("p", { class: "empty" }, t("noHistory")));

    return h("div", { class: "stack" },
      h("section", { class: "panel" },
        h("div", { class: "panel-title" }, t("available"), h("span", {}, t("rate"))),
        h("div", { class: "wallet-amount" }, coin(), fmtInt(me.available)),
        h("p", { class: "note", style: "margin:6px 0 14px" }, `${t("worth")} ${eur(me.available)}${c ? ` · ≈ ${est.toFixed(8).replace(/\.?0+$/, "")} ${c.code}` : ""}`),
        me.coins.length > 1 ? h("label", { class: "field" }, t("receiveIn"),
          h("select", {
            style: "margin-top:6px",
            onchange: async (e) => {
              const r = await api("set_coin", { coin: e.target.value });
              if (!r.ok) toast(message(r), "bad");
              await refreshMe();
              render();
            },
          }, me.coins.map((x) => h("option", { value: x.code, selected: x.code === me.payout_coin }, `${x.code} · ${x.name}`)))) : null,
        btn,
        h("p", { class: "note", style: "margin:10px 0 0;font-style:italic;text-align:center" }, t("wdDelay")),
        h("p", { class: "note", style: "margin:12px 0 0;overflow-wrap:anywhere" }, `${t("sentTo")} `, h("b", { style: "color:var(--ink)" }, me.fp_address)),
        (me.pending > 0 || me.validated > 0) ? h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" },
          me.pending > 0 ? h("span", { class: "badge warn" }, `${t("pending")} · ${tk(me.pending)}`) : null,
          me.validated > 0 ? h("span", { class: "badge good" }, `${t("validated")} · ${tk(me.validated)}`) : null) : null,
        me.validated > 0 ? h("p", { class: "note", style: "margin:8px 0 0" }, `${tk(me.validated)} ${t("wdValidated")}`) : null),
      h("section", { class: "panel" }, seg, list));
  }

  // Profil : niveau, parrainage, securite
  function profileView() {
    const lv = levelOf(me.earned_total || 0);
    const url = `${location.origin}${location.pathname}?ref=${me.ref_code}`;
    const field = h("input", { readOnly: true, value: url, ariaLabel: t("refLink") });
    const pass = h("input", { type: "password", autocomplete: "new-password", minLength: 8, required: true });
    const msg = h("div", { role: "alert" });
    const save = h("button", { class: "btn", type: "submit", style: "width:100%" }, me.secured ? t("secChange") : t("secSave"));
    return h("div", { class: "stack" },
      h("section", { class: "panel", style: "text-align:center" },
        h("div", { class: "avatar", style: "width:72px;height:72px;margin:0 auto;font-size:28px;border-radius:20px" }, (me.fp_address || "?").slice(0, 1).toUpperCase(), h("span", { class: "lvl" }, String(lv.lvl))),
        h("h2", { style: "margin-top:14px;overflow-wrap:anywhere" }, me.fp_address),
        h("p", { class: "note", style: "margin:4px 0 10px" }, `${t("level")} ${lv.lvl} · ${tk(lv.left)} ${t("toNext")} ${lv.lvl + 1}`),
        h("div", { class: "xp", style: "width:100%;height:10px" }, h("i", { style: `width:${lv.pct}%` }))),
      h("div", { class: "grid2" },
        h("section", { class: "panel" },
          h("div", { class: "panel-title" }, t("referral")),
          h("p", { class: "note" }, `${status?.referral_percent ?? 0} % ${t("refText")}`),
          h("div", { class: "copy" }, field, h("button", {
            class: "btn small", type: "button",
            onclick: async () => {
              try { await navigator.clipboard.writeText(url); } catch { field.select(); document.execCommand("copy"); }
              toast(t("copied"), "good");
            },
          }, t("copy"))),
          h("div", { class: "stats", style: "grid-template-columns:1fr 1fr;margin-top:12px" },
            h("div", { class: "stat" }, h("div", { class: "stat-value" }, fmtInt(me.referrals)), h("div", { class: "stat-sub" }, t("refCount"))),
            h("div", { class: "stat" }, h("div", { class: "stat-value" }, tk(me.referral_earned)), h("div", { class: "stat-sub" }, t("refEarned"))))),
        h("section", { class: "panel" },
          h("div", { class: "panel-title" }, t("security")),
          h("div", { class: `notice ${me.secured ? "good" : "info"}`, style: "margin-bottom:12px" }, me.secured ? t("secOn") : t("secOff")),
          h("form", {
            onsubmit: async (e) => {
              e.preventDefault();
              save.disabled = true;
              const r = await api("set_password", { password: pass.value });
              save.disabled = false;
              if (r.ok) {
                session = r.session;
                store.set("cc.session", session);
                toast(t("secDone"), "good");
                await refreshMe();
                render();
              } else msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:10px" }, message(r)));
            },
          }, h("label", { class: "field" }, t("secNew"), h("div", { class: "input" }, icon("lock"), pass)), save, msg))),
      h("button", {
        class: "btn ghost", type: "button", style: "width:100%",
        onclick: async () => {
          await api("logout");
          session = null;
          me = null;
          store.del("cc.session");
          location.hash = "";
          render();
        },
      }, t("logout")),
      h("div", { class: "foot-links" }, h("a", { href: "legal.html" }, t("legal")), h("a", { href: "https://faucetpay.io", rel: "noopener", target: "_blank" }, "FaucetPay")));
  }

  function shell() {
    const route = routeNow();
    header = h("header", { class: "topline" });
    updateHeader();
    const views = { "": homeView, earn: earnView, games: gamesView, wallet: walletView, profile: profileView };
    const gamesReady = !me.wheel_done || !me.daily_done || me.challenges.some((c) => !c.done && me.claims_today >= c.target);
    const nav = h("nav", { class: "tabbar", ariaLabel: "Menu" }, TABS.map(([k, label]) =>
      h("a", { class: "tab", href: `#${k}`, "aria-current": k === route ? "page" : undefined },
        icon(label), t(label), k === "games" && gamesReady && me.claims_today > 0 ? h("span", { class: "dot" }) : null)));
    return h("div", {},
      ticker(),
      h("div", { class: "shell" },
        header,
        status?.paused ? h("div", { class: "notice warn", style: "margin-bottom:14px" }, t("paused")) : null,
        views[route]()),
      nav);
  }

  function render() {
    clearTimers();
    const root = document.getElementById("root");
    root.replaceChildren(session && me ? shell() : gate());
  }

  async function publicStatus() {
    const r = await api("status");
    return r.code === "offline" || r.ok === false ? null : r;
  }

  async function boot() {
    status = await publicStatus();
    if (session) await refreshMe();
    const q = new URLSearchParams(location.search);
    const sl = q.get("sl");
    if (sl && session && me) {
      const r = await api("shortlink_complete", { token: sl });
      toast(r.ok ? `${tk(r.tokens)} ${t("credited")}` : message(r), r.ok ? "good" : "bad");
      await refreshMe();
    }
    if (q.get("ref")) store.set("cc.ref", q.get("ref"));
    if (sl || q.get("ref")) history.replaceState(null, "", location.pathname + location.hash);
    render();
  }

  window.addEventListener("hashchange", () => { if (session && me) refreshMe().then(render); });
  // Soldes et statut toutes les minutes, seulement si la page est visible.
  setInterval(async () => {
    if (document.hidden || !status) return;
    const s = await publicStatus();
    if (s) status = s;
    if (session && me) await refreshMe();
  }, 60000);

  background();
  boot();
})();
