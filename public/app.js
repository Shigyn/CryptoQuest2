(function () {
  const cfg = window.FAUCET_CONFIG;
  const TK = cfg.TOKEN;
  const lang = (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
  document.documentElement.lang = lang;
  document.title = cfg.SITE_NAME;

  // Chaque texte : [francais, anglais]
  const W = {
    login: ["Connexion", "Log in"], signup: ["Inscription", "Sign up"], logout: ["Déconnexion", "Log out"],
    heroSub: ["Faucet, pubs payantes, liens, offres et roue du jour. Retire quand tu veux, directement sur ton compte FaucetPay.", "Faucet, paid ads, links, offers and a daily wheel. Withdraw whenever you want, straight to your FaucetPay account."],
    heroA: ["Gagne des", "Earn"], heroB: [" en continu.", " around the clock."],
    eyebrow: ["Retraits instantanés sur FaucetPay", "Instant withdrawals to FaucetPay"],
    start: ["Commencer", "Get started"],
    simTitle: ["Estimation de tes gains", "Estimate your earnings"],
    simDay: ["Par jour", "Per day"],
    simNote: ["Estimation selon les récompenses actuelles, sans garantie de gain.", "Estimate based on current rewards, with no guarantee of earnings."],
    claimsUnit: ["réclamations", "claims"], viewsUnit: ["vues", "views"], linksUnit: ["liens", "links"],
    perClaim: ["par réclamation", "per claim"], perView: ["par vue", "per view"], perLink: ["par lien", "per link"],
    faucet: ["Faucet", "Faucet"], ptc: ["Pubs payantes", "Paid ads"], links: ["Liens raccourcis", "Shortlinks"],
    offers: ["Offres et sondages", "Offers and surveys"], daily: ["Bonus quotidien", "Daily bonus"],
    challenges: ["Défis", "Challenges"], referral: ["Parrainage", "Referrals"], withdraw: ["Retrait", "Withdraw"],
    history: ["Historique", "History"], home: ["Tableau de bord", "Dashboard"],
    statsTitle: ["Le site en chiffres", "The site in numbers"],
    statUsers: ["membres", "members"], statPaid: ["versés aux membres", "paid to members"], statLast: ["derniers paiements", "latest payouts"],
    featuresTitle: ["Plusieurs façons de gagner", "Several ways to earn"],
    fFaucet: ["Réclame toutes les quelques minutes, les CryptoCoin arrivent tout de suite.", "Claim every few minutes, CryptoCoin arrive right away."],
    fPtc: ["Regarde une publicité pendant quelques secondes.", "View an ad for a few seconds."],
    fLinks: ["Passe par un lien raccourci et reviens sur le site.", "Go through a shortlink and come back to the site."],
    fOffers: ["Termine des tâches et des sondages pour gagner plus.", "Complete tasks and surveys to earn more."],
    fChallenges: ["Atteins tes objectifs du jour et récupère ton bonus.", "Reach your daily goals and collect your bonus."],
    fReferral: ["Invite tes amis et gagne une part de leurs CryptoCoin.", "Invite friends and earn a share of their CryptoCoin."],
    latest: ["Derniers paiements", "Latest payouts"], noPayout: ["Aucun paiement pour le moment.", "No payouts yet."],
    legal: ["Mentions et confidentialité", "Legal and privacy"], fpCreate: ["Créer un compte FaucetPay", "Create a FaucetPay account"],
    email: ["E-mail", "Email"], password: ["Mot de passe (8 caractères minimum)", "Password (8 characters minimum)"], passwordShort: ["Mot de passe", "Password"],
    create: ["Créer mon compte", "Create my account"], sign: ["Me connecter", "Log in"],
    enter: ["Entrer", "Enter"],
    enterTitle: ["Entre avec ton compte FaucetPay", "Enter with your FaucetPay account"],
    enterText: ["Rien d'autre à remplir : ton compte est créé à la première visite, et tes gains partent vers ce compte FaucetPay.", "Nothing else to fill in: your account is created on your first visit, and your earnings go to this FaucetPay account."],
    passwordAsk: ["Ce compte est protégé par un mot de passe.", "This account is protected by a password."],
    security: ["Sécurité", "Security"],
    secTitle: ["Sécuriser mon compte", "Secure my account"],
    secText: ["Facultatif. Avec un mot de passe, connaître ton adresse FaucetPay ne suffit plus pour entrer dans ton compte. Tes autres appareils seront déconnectés.", "Optional. With a password, knowing your FaucetPay address is no longer enough to enter your account. Your other devices will be logged out."],
    secOn: ["Ton compte est protégé par un mot de passe.", "Your account is protected by a password."],
    secOff: ["Ton compte n'a pas de mot de passe : ton adresse FaucetPay suffit pour y entrer.", "Your account has no password: your FaucetPay address is enough to enter it."],
    secNew: ["Nouveau mot de passe (8 caractères minimum)", "New password (8 characters minimum)"],
    secSave: ["Enregistrer le mot de passe", "Save password"], secChange: ["Changer le mot de passe", "Change password"],
    secDone: ["Mot de passe enregistré.", "Password saved."],
    wheel: ["Roue du jour", "Daily wheel"],
    wheelText: ["Un tour gratuit par jour, après ta première réclamation. Aucune mise.", "One free spin a day, after your first claim. No stake."],
    spin: ["Tourner la roue", "Spin the wheel"], spun: ["Reviens demain pour un nouveau tour.", "Come back tomorrow for another spin."],
    won: ["gagnés à la roue.", "won on the wheel."],
    available: ["Disponible", "Available"], pending: ["À valider", "Under review"], validated: ["Validé", "Approved"],
    linkTitle: ["Relie ton compte FaucetPay", "Link your FaucetPay account"],
    linkText: ["Il faut un compte FaucetPay pour gagner et retirer tes CryptoCoin.", "You need a FaucetPay account to earn and withdraw CryptoCoin."],
    fpField: ["Ton e-mail, pseudo ou adresse FaucetPay", "Your FaucetPay email, username or address"],
    linkBtn: ["Relier ce compte", "Link this account"], linked: ["Compte FaucetPay relié.", "FaucetPay account linked."],
    claim: ["Réclamer", "Claim"], next: ["Prochaine réclamation dans", "Next claim in"], closed: ["Faucet fermé", "Faucet closed"],
    claimed: ["ajoutés à ton solde.", "added to your balance."], every: ["toutes les", "every"], min: ["min", "min"], sec: ["s", "s"],
    today: ["Aujourd'hui", "Today"], worth: ["soit", "worth"],
    bonusText: ["Fais au moins une réclamation, puis récupère ton bonus.", "Make at least one claim, then collect your bonus."],
    collect: ["Récupérer", "Collect"], done: ["Récupéré", "Collected"], progress: ["réclamation(s) aujourd'hui", "claim(s) today"],
    pendingNote: ["Ces gains passent par une vérification, puis partent automatiquement sur FaucetPay au paiement de chaque heure.", "These earnings are reviewed, then sent to FaucetPay automatically with the hourly payout."],
    noPtc: ["Aucune publicité disponible. Reviens plus tard.", "No ads available. Come back later."],
    noLinks: ["Aucun lien disponible. Reviens plus tard.", "No links available. Come back later."],
    noOffers: ["Aucune offre disponible. Reviens plus tard.", "No offers available. Come back later."],
    view: ["Voir la pub", "View ad"], watch: ["Reste sur la pub encore", "Stay on the ad for"], confirm: ["Valider ma vue", "Confirm my view"],
    open: ["Ouvrir le lien", "Open link"], left: ["restants aujourd'hui", "left today"], open2: ["Ouvrir", "Open"],
    credited: ["ajoutés, en attente de validation.", "added, under review."],
    refText: ["de tout ce que gagnent tes filleuls te revient.", "of everything your referrals earn goes to you."],
    refLink: ["Ton lien de parrainage", "Your referral link"], copy: ["Copier", "Copy"], copied: ["Lien copié.", "Link copied."],
    refCount: ["filleuls", "referrals"], refEarned: ["gagnés grâce à eux", "earned from them"],
    wdNow: ["Retirer maintenant", "Withdraw now"], wdCoin: ["Recevoir en", "Receive in"], wdTo: ["Envoyé vers", "Sent to"], change: ["Changer de compte", "Change account"],
    wdDone: ["envoyés sur ton compte FaucetPay. Paiement n°", "sent to your FaucetPay account. Payout #"],
    wdValidated: ["partiront au prochain paiement horaire.", "will be sent with the next hourly payout."],
    wdHistory: ["Mes retraits", "My withdrawals"], noWd: ["Aucun retrait pour le moment.", "No withdrawals yet."],
    noHistory: ["Aucun mouvement pour le moment. Fais ta première réclamation.", "No activity yet. Make your first claim."],
    rate: ["10 000 CryptoCoin = 1 €", "10,000 CryptoCoin = €1"], date: ["Date", "Date"], amount: ["Montant", "Amount"], status: ["État", "Status"], source: ["Origine", "Source"],
    st_paid: ["Payé", "Paid"], st_failed: ["Refusé", "Refused"], st_unknown: ["En vérification", "Being checked"], st_reserved: ["En cours", "Processing"],
    hello: ["Bonjour", "Hello"], offline: ["Le site ne répond pas. Vérifie ta connexion et réessaie.", "The site isn't responding. Check your connection and try again."],
    needCaptcha: ["Valide le captcha, puis appuie de nouveau.", "Complete the captcha, then press again."],
    allPaused: ["Le site est en pause pour le moment. Tes CryptoCoin restent sur ton compte.", "The site is paused for now. Your CryptoCoin stay on your account."],
  };
  const t = (k) => (W[k] ? W[k][lang === "fr" ? 0 : 1] : k);

  const ERR = {
    captcha: ["Le captcha a échoué. Valide-le de nouveau.", "The captcha failed. Complete it again."],
    invalid_address: ["FaucetPay ne connaît pas ce compte. Vérifie ton identifiant.", "FaucetPay doesn't know this account. Check your ID."],
    invalid_email: ["Saisis une adresse e-mail valide.", "Enter a valid email address."],
    weak_password: ["Choisis un mot de passe d'au moins 8 caractères.", "Choose a password of at least 8 characters."],
    password_required: ["Ce compte est protégé : saisis ton mot de passe.", "This account is protected: enter your password."],
    bad_password: ["Mot de passe incorrect.", "Wrong password."],
    bad_credentials: ["E-mail ou mot de passe incorrect.", "Wrong email or password."],
    email_taken: ["Cet e-mail a déjà un compte. Connecte-toi.", "This email already has an account. Log in."],
    too_many_signups: ["Trop de comptes créés depuis cette connexion. Réessaie demain.", "Too many accounts from this connection. Try again tomorrow."],
    fp_taken: ["Ce compte FaucetPay est déjà relié à un autre membre.", "This FaucetPay account is already linked to another member."],
    link_faucetpay: ["Relie d'abord ton compte FaucetPay.", "Link your FaucetPay account first."],
    cooldown: ["Patiente jusqu'à la fin du compte à rebours.", "Wait until the countdown ends."],
    daily_limit: ["Limite quotidienne atteinte. Reviens demain.", "Daily limit reached. Come back tomorrow."],
    banned: ["Ce compte ne peut plus gagner ici.", "This account can no longer earn here."],
    paused: ["Le site est en pause pour le moment. Tes CryptoCoin restent sur ton compte.", "The site is paused for now. Your CryptoCoin stay on your account."],
    coin_empty: ["Le solde de cette crypto est vide. Tes CryptoCoin sont intacts. Réessaie plus tard.", "This coin has run dry. Your CryptoCoin are safe. Try again later."],
    coin_unavailable: ["Cette crypto n'est plus disponible. Choisis-en une autre.", "This coin is no longer available. Pick another."],
    nothing_to_withdraw: ["Tu n'as aucun CryptoCoin à retirer pour le moment.", "You have no CryptoCoin to withdraw right now."],
    amount_too_small: ["Ce montant est trop petit pour cette crypto. Gagne encore quelques CryptoCoin.", "This amount is too small for this coin. Earn a few more CryptoCoin."],
    pending: ["FaucetPay n'a pas encore confirmé ton paiement. Vérifie ton compte dans quelques minutes.", "FaucetPay hasn't confirmed your payout yet. Check your account in a few minutes."],
    try_later: ["Le service est occupé. Réessaie dans une minute.", "The service is busy. Try again in a minute."],
    already_done: ["C'est déjà fait pour aujourd'hui.", "Already done for today."],
    not_reached: ["Objectif pas encore atteint.", "Goal not reached yet."],
    too_soon: ["Reste encore quelques secondes sur la page.", "Stay on the page a few more seconds."],
    not_found: ["Cet élément n'est plus disponible.", "This item is no longer available."],
    unauthorized: ["Ta session a expiré. Connecte-toi de nouveau.", "Your session expired. Log in again."],
  };
  const errText = (code) => (ERR[code] || ERR.try_later)[lang === "fr" ? 0 : 1];

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

  const ICONS = {
    drop: "M12 3s7 7.2 7 12a7 7 0 1 1-14 0c0-4.800 7-12 7-12z",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    link: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1m2 4a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
    list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
    flag: "M5 21V4m0 0h12l-2 4 2 4H5",
    users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m6-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12 9v-1a4 4 0 0 0-3-3.900M16 4.100a3 3 0 0 1 0 5.800",
  };
  function icon(name) {
    const wrap = h("span", { class: "icon" });
    wrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
    return wrap;
  }
  function logo() {
    const a = h("a", { class: "logo", href: "#" });
    a.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2s11 11.200 11 18.500a11 11 0 0 1-22 0C5 13.200 16 2 16 2z" fill="#1f5ae0"/><path d="M21 19.500a5 5 0 1 1-1.700-3.800" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round"/></svg>';
    a.append(cfg.SITE_NAME);
    return a;
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
      store.del("cc.session");
      me = null;
      render();
    }
    return data;
  }
  const message = (r) => (r.code === "offline" ? t("offline") : errText(r.code));

  // Captcha : un widget par formulaire
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
          sitekey: cfg.TURNSTILE_SITE_KEY,
          language: lang,
          theme: "dark",
          callback: (tok) => { state.token = tok; },
          "expired-callback": () => { state.token = ""; },
          "error-callback": () => { state.token = ""; },
        });
      });
    }
    return box;
  }
  const captchaToken = (box) => captchaState.get(box)?.token || "";
  function captchaReset(box) {
    const s = captchaState.get(box);
    if (!s) return;
    s.token = "";
    if (window.turnstile && s.widget !== null) window.turnstile.reset(s.widget);
  }

  // Mise en forme
  const fmtInt = (n) => Number(n).toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const tk = (n) => `${fmtInt(n)} ${TK}`;
  const eur = (tokens) => {
    const rate = status?.tokens_per_eur || 10000;
    const v = tokens / rate;
    return v.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: v < 0.01 ? 4 : 2, maximumFractionDigits: 4 }) + " €";
  };
  const units = (u, d) => (u / 10 ** d).toFixed(d).replace(/\.?0+$/, "");
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const when = (iso) => new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { dateStyle: "short", timeStyle: "short" });

  let toastTimer = null;
  function toast(text, kind = "info") {
    document.querySelector(".toast")?.remove();
    const el = h("div", { class: `notice toast ${kind}`, role: "status" }, text);
    document.body.append(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 6000);
  }

  const adSlot = (slot) => {
    const html = cfg.ADS?.[slot];
    if (!html) return null;
    const box = h("div", { class: "ad" });
    // createContextualFragment execute les scripts du reseau publicitaire.
    box.append(document.createRange().createContextualFragment(html));
    return box;
  };

  // Accueil ----------------------------------------------------------------
  // Fond anime : reseau de points relies, en pause quand l'onglet est cache.
  function background() {
    if (document.querySelector(".bg")) return;
    const layer = h("div", { class: "bg", "aria-hidden": "true" });
    const canvas = h("canvas", {});
    layer.append(canvas);
    document.body.prepend(layer);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    let w = 0, ht = 0, dpr = 1, points = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      ht = canvas.height = innerHeight * dpr;
      const count = Math.round(Math.min(70, (innerWidth * innerHeight) / 22000));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * ht,
        vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
      }));
    };
    resize();
    addEventListener("resize", resize);
    const link = 150 * dpr;
    const frame = () => {
      if (!document.hidden) {
        ctx.clearRect(0, 0, w, ht);
        for (const p of points) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > ht) p.vy *= -1;
        }
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const a = points[i], b = points[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < link) {
              ctx.strokeStyle = `rgba(80, 150, 255, ${0.22 * (1 - d / link)})`;
              ctx.lineWidth = dpr;
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
        ctx.fillStyle = "rgba(120, 200, 255, .8)";
        for (const p of points) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * dpr, 0, Math.PI * 2); ctx.fill(); }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function recentList(list) {
    if (!list?.length) return h("p", { class: "muted" }, t("noPayout"));
    return h("div", { class: "table-wrap" }, h("table", {}, h("tbody", {}, list.map((r) =>
      h("tr", {},
        h("td", { class: "mono" }, r.who),
        h("td", { class: "num mono" }, `${units(r.amount_units, r.decimals)} ${r.coin}`),
        h("td", { class: "num muted" }, when(r.at)))))));
  }

  // Un seul champ : l'adresse FaucetPay. Le mot de passe n'apparait que si le compte en a un.
  function authForm() {
    const wrap = h("section", { class: "card auth", id: "auth" });
    const draw = () => {
      const address = h("input", { autocomplete: "username", autocapitalize: "off", spellcheck: false, maxLength: 128, required: true, placeholder: "toi@exemple.com", value: store.get("cc.address") || "" });
      const passLabel = h("label", { class: "field", hidden: true }, t("passwordShort"), h("input", { type: "password", autocomplete: "current-password" }));
      const pass = passLabel.querySelector("input");
      const msg = h("div", { role: "alert" });
      const submit = h("button", { class: "btn big", type: "submit" }, t("enter"));
      const form = h("form", {
        novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          submit.disabled = true;
          const r = await api("login", {
            address: address.value,
            password: passLabel.hidden ? undefined : pass.value,
            ref: store.get("cc.ref"),
          });
          submit.disabled = false;
          if (r.ok) {
            store.set("cc.address", address.value.trim());
            session = r.session;
            store.set("cc.session", session);
            location.hash = "";
            await boot();
          } else if (r.code === "password_required") {
            passLabel.hidden = false;
            msg.replaceChildren(h("div", { class: "notice info", style: "margin-top:12px" }, t("passwordAsk")));
            pass.focus();
          } else {
            msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:12px" }, message(r)));
          }
        },
      },
        h("label", { class: "field" }, t("fpField"), address),
        passLabel, submit, msg);
      wrap.replaceChildren(h("h2", {}, t("enterTitle")), h("p", { class: "muted", style: "margin:4px 0 14px" }, t("enterText")), form);
    };
    draw();
    return wrap;
  }

  function homePage() {
    const feature = (i, title, text) => h("div", { class: "card feature" }, icon(i), h("div", {}, h("h3", {}, title), h("p", {}, text)));
    const scrollAuth = (e) => {
      e.preventDefault();
      document.getElementById("auth")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => document.querySelector("#auth input")?.focus({ preventScroll: true }), 400);
    };
    return h("div", {},
      h("header", { class: "topbar" }, logo(), h("a", { class: "btn", href: "#auth", onclick: scrollAuth }, t("enter"))),
      h("main", { class: "home" },
        h("section", { class: "hero" },
          h("div", {},
            h("span", { class: "eyebrow" }, t("eyebrow")),
            h("h1", {}, t("heroA"), " ", h("span", { class: "accent" }, "CryptoCoin"), t("heroB")),
            h("p", { class: "lead" }, t("heroSub")),
            h("div", { class: "metrics" },
              h("div", { class: "metric" }, h("b", {}, fmtInt(status?.users ?? 0)), h("span", {}, t("statUsers"))),
              h("div", { class: "metric" }, h("b", {}, tk(status?.paid_tokens ?? 0)), h("span", {}, t("statPaid"))),
              h("div", { class: "metric" }, h("b", {}, "10 000 CC"), h("span", {}, "= 1 €")))),
          authForm()),
        status?.paused ? h("div", { class: "notice warn", style: "margin-bottom:16px" }, t("allPaused")) : null,
        status ? null : h("div", { class: "notice bad", style: "margin-bottom:16px" }, t("offline")),
        adSlot("top") && h("div", { style: "margin-top:16px" }, adSlot("top")),
        h("h2", { class: "section-title" }, t("featuresTitle")),
        h("section", { class: "grid" },
          feature("drop", t("faucet"), t("fFaucet")),
          feature("eye", t("ptc"), t("fPtc")),
          feature("link", t("links"), t("fLinks")),
          feature("list", t("offers"), t("fOffers")),
          feature("flag", t("challenges"), t("fChallenges")),
          feature("users", t("referral"), t("fReferral"))),
        h("h2", { class: "section-title" }, t("latest")),
        h("section", { class: "card" }, recentList(status?.recent)),
        adSlot("bottom") && h("div", { style: "margin-top:16px" }, adSlot("bottom"))),
      footer());
  }

  const footer = () => h("footer", { class: "foot" },
    h("a", { href: "legal.html" }, t("legal")),
    h("a", { href: "https://faucetpay.io", rel: "noopener" }, t("fpCreate")));

  // Application ------------------------------------------------------------
  const ROUTES = [
    ["", "home"], ["faucet", "faucet"], ["ptc", "ptc"], ["links", "links"], ["offers", "offers"],
    ["challenges", "challenges"], ["referral", "referral"], ["withdraw", "withdraw"], ["history", "history"], ["security", "security"],
  ];
  const routeNow = () => location.hash.replace("#", "");
  let earn = null;
  let timers = [];
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };

  async function refreshMe() {
    const r = await api("me");
    if (r.ok) { me = r; updateChip(); }
    return r;
  }

  let chip = null;
  function updateChip() {
    if (!chip || !me) return;
    const cell = (label, v) => h("div", {}, label, h("b", {}, tk(v)));
    chip.replaceChildren(cell(t("available"), me.available), cell(t("pending"), me.pending), cell(t("validated"), me.validated));
  }

  function securityPage() {
    const pass = h("input", { type: "password", autocomplete: "new-password", minLength: 8, required: true });
    const msg = h("div", { role: "alert" });
    const btn = h("button", { class: "btn", type: "submit" }, me.secured ? t("secChange") : t("secSave"));
    return h("section", { class: "card claim-card" },
      h("h2", {}, t("secTitle")),
      h("div", { class: `notice ${me.secured ? "good" : "info"}`, style: "margin:10px 0" }, me.secured ? t("secOn") : t("secOff")),
      h("p", { class: "muted", style: "margin-bottom:12px" }, t("secText")),
      h("form", {
        onsubmit: async (e) => {
          e.preventDefault();
          btn.disabled = true;
          const r = await api("set_password", { password: pass.value });
          btn.disabled = false;
          if (r.ok) {
            session = r.session;
            store.set("cc.session", session);
            toast(t("secDone"), "good");
            await refreshMe();
            render();
          } else msg.replaceChildren(h("div", { class: "notice bad", style: "margin-top:10px" }, message(r)));
        },
      }, h("label", { class: "field" }, t("secNew"), pass), btn, msg));
  }

  function faucetCard() {
    const reward = status?.faucet_reward_tokens ?? 0;
    const cooldown = status?.cooldown_seconds ?? 300;
    const fill = h("i", {});
    const cap = captchaBox();
    const btn = h("button", { class: "btn big", type: "submit" });
    let readyAt = Date.now() + (me.retry_after || 0) * 1000;
    let busy = false;
    const tick = () => {
      const left = Math.ceil((readyAt - Date.now()) / 1000);
      fill.style.width = `${left > 0 ? (1 - left / cooldown) * 100 : 100}%`;
      if (busy) return;
      if (status?.paused) { btn.disabled = true; btn.textContent = t("closed"); }
      else if (left > 0) { btn.disabled = true; btn.textContent = `${t("next")} ${clock(left)}`; }
      else { btn.disabled = false; btn.textContent = `${t("claim")} ${tk(reward)}`; }
    };
    tick();
    every(tick, 1000);
    const dur = cooldown >= 60 ? `${Math.round(cooldown / 60)} ${t("min")}` : `${cooldown} ${t("sec")}`;
    return h("section", { class: "card claim-card" },
      h("div", { class: "claim-amount" }, tk(reward)),
      h("p", { class: "muted", style: "margin:2px 0 12px" }, `${t("worth")} ${eur(reward)}, ${t("every")} ${dur}`),
      h("div", { class: "bar", style: "margin-bottom:14px" }, fill),
      h("form", {
        onsubmit: async (e) => {
          e.preventDefault();
          if (cfg.TURNSTILE_SITE_KEY && !captchaToken(cap)) { toast(t("needCaptcha"), "bad"); return; }
          busy = true;
          btn.disabled = true;
          const r = await api("claim", { captcha: captchaToken(cap) || "dev" });
          busy = false;
          captchaReset(cap);
          if (r.ok) {
            readyAt = Date.now() + r.cooldown_seconds * 1000;
            toast(`${tk(r.tokens)} ${t("claimed")}`, "good");
            await refreshMe();
          } else {
            if (r.retry_after) readyAt = Date.now() + r.retry_after * 1000;
            toast(message(r), "bad");
            if (r.code === "paused") { status = await publicStatus() || status; }
          }
          tick();
        },
      }, cap, btn));
  }

  function bonusCard() {
    const btn = h("button", {
      class: "btn", disabled: me.daily_done,
      onclick: async () => {
        const r = await api("daily");
        toast(r.ok ? `${tk(r.tokens)} ${t("claimed")}` : message(r), r.ok ? "good" : "bad");
        await refreshMe();
        render();
      },
    }, me.daily_done ? t("done") : `${t("collect")} ${tk(me.daily_bonus_tokens)}`);
    return h("section", { class: "card" },
      h("h2", {}, t("daily")), h("p", { class: "muted", style: "margin:4px 0 12px" }, t("bonusText")), btn);
  }

  // Roue gratuite : le serveur tire le gain, la roue ne fait que l'afficher.
  function wheelCard() {
    const prizes = me.wheel_prizes || [];
    const n = Math.max(prizes.length, 1);
    const colors = ["#1f5ae0", "#5fb4f5", "#14275a", "#ffaa40"];
    const stops = prizes.map((_, i) => `${colors[i % (n % 4 === 1 && i === n - 1 ? 3 : 4)]} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`).join(", ");
    const disc = h("div", { class: "wheel-disc", style: `background:conic-gradient(${stops})` },
      prizes.map((p, i) => h("span", { class: "wheel-label", style: `transform:translate(-50%, -50%) rotate(${(i + 0.5) * 360 / n}deg) translateY(-74px)` }, String(p))));
    let turns = Number(store.get("cc.wheelTurn")) || 0;
    disc.style.transform = `rotate(${turns}deg)`;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const btn = h("button", {
      class: "btn", disabled: me.wheel_done || me.claims_today < me.wheel_min_claims,
      onclick: async () => {
        btn.disabled = true;
        const r = await api("wheel");
        if (!r.ok) { toast(message(r), "bad"); btn.disabled = false; return; }
        // La case gagnante s'arrete sous le pointeur, en haut.
        const target = 360 - (r.index + 0.5) * 360 / n;
        turns = turns - (turns % 360) + 360 * 5 + target;
        store.set("cc.wheelTurn", String(turns % 360));
        disc.style.transition = reduce ? "none" : "transform 4s cubic-bezier(.15,.85,.2,1)";
        disc.style.transform = `rotate(${turns}deg)`;
        setTimeout(async () => { toast(`${tk(r.tokens)} ${t("won")}`, "good"); await refreshMe(); render(); }, reduce ? 50 : 4200);
      },
    }, me.wheel_done ? t("done") : t("spin"));
    return h("section", { class: "card" },
      h("h2", {}, t("wheel")),
      h("p", { class: "muted", style: "margin:4px 0 12px" }, me.wheel_done ? t("spun") : t("wheelText")),
      h("div", { class: "wheel" }, h("div", { class: "wheel-pointer", "aria-hidden": "true" }), disc),
      h("div", { style: "text-align:center;margin-top:12px" }, btn));
  }

  function challengesCard() {
    return h("section", { class: "card" },
      h("div", { class: "row between", style: "margin-bottom:8px" }, h("h2", {}, t("challenges")), h("span", { class: "pill" }, `${me.claims_today} ${t("progress")}`)),
      me.challenges.map((c) => {
        const pct = Math.min(100, (me.claims_today / c.target) * 100);
        const ready = me.claims_today >= c.target && !c.done;
        return h("div", { class: "item" },
          h("div", { style: "flex:1;min-width:180px" },
            h("h3", {}, lang === "fr" ? c.name : `${c.target} ${t("progress")}`),
            h("div", { class: "bar", style: "margin-top:6px;height:7px" }, h("i", { style: `width:${pct}%` }))),
          h("button", {
            class: "btn small", disabled: !ready,
            onclick: async () => {
              const r = await api("challenge", { id: c.id });
              toast(r.ok ? `${tk(r.tokens)} ${t("claimed")}` : message(r), r.ok ? "good" : "bad");
              await refreshMe();
              render();
            },
          }, c.done ? t("done") : `${t("collect")} ${tk(c.reward_tokens)}`));
      }));
  }

  async function loadEarn() {
    const r = await api("earn_list");
    if (r.ok) earn = r;
    return r;
  }

  function ptcPage() {
    const box = h("section", { class: "card" }, h("h2", {}, t("ptc")));
    const draw = () => {
      if (!earn) return;
      box.replaceChildren(h("h2", { style: "margin-bottom:6px" }, t("ptc")), h("p", { class: "muted", style: "margin-bottom:10px" }, t("pendingNote")));
      if (!earn.ptc.length) { box.append(h("p", {}, t("noPtc"))); return; }
      for (const c of earn.ptc) box.append(ptcRow(c));
    };
    const ptcRow = (c) => {
      const action = h("div", { class: "row" });
      const startBtn = h("button", {
        class: "btn small",
        onclick: async () => {
          // Ouverture immediate, sinon le navigateur bloque la fenetre.
          const win = window.open("about:blank", "_blank");
          const r = await api("ptc_start", { id: c.id });
          if (!r.ok) { win?.close(); toast(message(r), "bad"); return; }
          if (win) { win.opener = null; win.location = r.url; }
          let left = r.duration_seconds;
          action.replaceChildren(h("span", { class: "pill warn" }, `${t("watch")} ${left} ${t("sec")}`));
          const id = every(() => {
            left -= 1;
            if (left > 0) { action.firstChild.textContent = `${t("watch")} ${left} ${t("sec")}`; return; }
            clearInterval(id);
            const cap = captchaBox();
            const confirm = h("button", {
              class: "btn small orange",
              onclick: async () => {
                if (cfg.TURNSTILE_SITE_KEY && !captchaToken(cap)) { toast(t("needCaptcha"), "bad"); return; }
                const done = await api("ptc_complete", { id: c.id, captcha: captchaToken(cap) || "dev" });
                captchaReset(cap);
                toast(done.ok ? `${tk(done.tokens)} ${t("credited")}` : message(done), done.ok ? "good" : "bad");
                if (done.ok || done.code === "already_done") { await loadEarn(); await refreshMe(); draw(); }
              },
            }, t("confirm"));
            action.replaceChildren(h("div", {}, cap, confirm));
          }, 1000);
        },
      }, t("view"));
      action.append(startBtn);
      return h("div", { class: "item" },
        h("div", {}, h("h3", {}, c.title), h("p", { class: "muted" }, `${tk(c.reward_tokens)} · ${c.duration_seconds} ${t("sec")}`)), action);
    };
    loadEarn().then(draw);
    return box;
  }

  function linksPage() {
    const linkCap = captchaBox();
    const box = h("section", { class: "card" }, h("h2", {}, t("links")));
    loadEarn().then(() => {
      if (!earn) return;
      box.replaceChildren(h("h2", { style: "margin-bottom:6px" }, t("links")), h("p", { class: "muted", style: "margin-bottom:10px" }, t("pendingNote")));
      if (!earn.shortlinks.length) { box.append(h("p", {}, t("noLinks"))); return; }
      box.append(linkCap);
      for (const p of earn.shortlinks) {
        box.append(h("div", { class: "item" },
          h("div", {}, h("h3", {}, p.name), h("p", { class: "muted" }, `${tk(p.reward_tokens)} · ${p.remaining} ${t("left")}`)),
          h("button", {
            class: "btn small", disabled: p.remaining < 1,
            onclick: async () => {
              if (cfg.TURNSTILE_SITE_KEY && !captchaToken(linkCap)) { toast(t("needCaptcha"), "bad"); return; }
              const r = await api("shortlink_start", { id: p.id, captcha: captchaToken(linkCap) || "dev" });
              captchaReset(linkCap);
              if (r.ok) location.href = r.url;
              else toast(message(r), "bad");
            },
          }, t("open"))));
      }
    });
    return box;
  }

  function offersPage() {
    const frame = h("div", {});
    const box = h("section", { class: "card" }, h("h2", {}, t("offers")));
    loadEarn().then(() => {
      if (!earn) return;
      box.replaceChildren(h("h2", { style: "margin-bottom:6px" }, t("offers")), h("p", { class: "muted", style: "margin-bottom:10px" }, t("pendingNote")));
      if (!earn.offerwalls.length) { box.append(h("p", {}, t("noOffers"))); return; }
      const open = (w) => frame.replaceChildren(h("iframe", { class: "wall", src: w.iframe_url.replaceAll("{user}", encodeURIComponent(me.ref_code)), title: w.name }));
      box.append(h("div", { class: "row", style: "margin-bottom:12px" }, earn.offerwalls.map((w) =>
        h("button", { class: "btn small ghost", onclick: () => open(w) }, `${t("open2")} ${w.name}`))), frame);
      open(earn.offerwalls[0]);
    });
    return box;
  }

  function referralPage() {
    const url = `${location.origin}${location.pathname}?ref=${me.ref_code}`;
    const field = h("input", { readOnly: true, value: url, ariaLabel: t("refLink") });
    return h("div", { class: "stack" },
      h("section", { class: "card" },
        h("h2", {}, t("referral")),
        h("p", { class: "muted", style: "margin:4px 0 12px" }, `${status?.referral_percent ?? 0} % ${t("refText")}`),
        h("label", { class: "field" }, t("refLink"),
          h("div", { class: "copy", style: "margin-top:5px" }, field,
            h("button", {
              class: "btn", type: "button",
              onclick: async () => {
                try { await navigator.clipboard.writeText(url); } catch { field.select(); document.execCommand("copy"); }
                toast(t("copied"), "good");
              },
            }, t("copy"))))),
      h("section", { class: "grid" },
        h("div", { class: "card stat" }, h("b", {}, fmtInt(me.referrals)), t("refCount")),
        h("div", { class: "card stat" }, h("b", {}, tk(me.referral_earned)), t("refEarned"))));
  }

  function withdrawPage() {
    const coin = me.coins.find((c) => c.code === me.payout_coin) || me.coins[0];
    const rate = status?.tokens_per_eur || 10000;
    const estimate = coin && me.available > 0 ? (me.available / rate * coin.per_eur) : 0;
    const btn = h("button", {
      class: "btn big", disabled: me.available <= 0 || !coin || status?.paused,
      onclick: async () => {
        btn.disabled = true;
        const r = await api("withdraw");
        if (r.ok) toast(`${units(r.amount_units, r.decimals)} ${r.coin} ${t("wdDone")} ${r.payout_id}`, "good");
        else toast(message(r), r.code === "pending" ? "info" : "bad");
        await refreshMe();
        render();
      },
    }, `${t("wdNow")}${me.available > 0 ? ` · ${tk(me.available)}` : ""}`);
    return h("div", { class: "stack" },
      h("section", { class: "card claim-card" },
        h("h2", {}, t("withdraw")),
        h("div", { class: "claim-amount", style: "margin-top:8px" }, tk(me.available)),
        h("p", { class: "muted", style: "margin-bottom:12px" }, `${t("worth")} ${eur(me.available)}${coin ? ` · ≈ ${estimate.toFixed(8).replace(/\.?0+$/, "")} ${coin.code}` : ""}`),
        me.coins.length > 1 ? h("label", { class: "field" }, t("wdCoin"),
          h("select", {
            onchange: async (e) => {
              const r = await api("set_coin", { coin: e.target.value });
              if (!r.ok) toast(message(r), "bad");
              await refreshMe();
              render();
            },
          }, me.coins.map((c) => h("option", { value: c.code, selected: c.code === me.payout_coin }, `${c.code} · ${c.name}`)))) : null,
        btn,
        h("p", { class: "muted", style: "margin-top:10px;overflow-wrap:anywhere" }, `${t("wdTo")} `, h("span", { class: "mono" }, me.fp_address)),
        me.validated > 0 ? h("div", { class: "notice info", style: "margin-top:12px" }, `${tk(me.validated)} ${t("wdValidated")}`) : null),
      h("section", { class: "card" },
        h("h2", { style: "margin-bottom:8px" }, t("wdHistory")),
        me.withdrawals.length ? h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", {}, t("date")), h("th", {}, t("amount")), h("th", {}, t("status")))),
          h("tbody", {}, me.withdrawals.map((w) => h("tr", {},
            h("td", {}, when(w.at)),
            h("td", { class: "mono" }, `${units(w.amount_units, w.decimals)} ${w.coin}`),
            h("td", {}, h("span", { class: `pill ${w.status === "paid" ? "good" : w.status === "failed" ? "bad" : "warn"}` }, t(`st_${w.status}`))))))))
          : h("p", { class: "muted" }, t("noWd"))));
  }

  const SOURCE = {
    faucet: ["Faucet", "Faucet"], daily: ["Bonus quotidien", "Daily bonus"], challenge: ["Défi", "Challenge"], referral: ["Parrainage", "Referral"],
    ptc: ["Pub payante", "Paid ad"], shortlink: ["Lien raccourci", "Shortlink"], offer: ["Offre", "Offer"], offer_reversed: ["Offre annulée", "Offer reversed"],
    wheel: ["Roue du jour", "Daily wheel"], validation: ["Validation", "Approval"], rejected: ["Gain refusé", "Refused"], withdrawal: ["Retrait", "Withdrawal"], withdrawal_refund: ["Retrait rendu", "Refund"],
  };
  function historyPage() {
    const bucket = { available: t("available"), pending: t("pending"), validated: t("validated") };
    return h("section", { class: "card" },
      h("h2", { style: "margin-bottom:8px" }, t("history")),
      me.history.length ? h("div", { class: "table-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, t("date")), h("th", {}, t("source")), h("th", {}, ""), h("th", { class: "num" }, t("amount")))),
        h("tbody", {}, me.history.map((r) => h("tr", {},
          h("td", {}, when(r.at)),
          h("td", {}, (SOURCE[r.source] || [r.source, r.source])[lang === "fr" ? 0 : 1]),
          h("td", {}, h("span", { class: "pill" }, bucket[r.bucket])),
          h("td", { class: "num mono" }, `${r.delta > 0 ? "+" : ""}${fmtInt(r.delta)}`))))))
        : h("p", { class: "muted" }, t("noHistory")));
  }

  function dashboardPage() {
    return h("div", { class: "stack" },
      h("div", { class: "grid" }, faucetCard(), wheelCard(), bonusCard()),
      challengesCard(),
      h("section", { class: "card" }, h("h2", { style: "margin-bottom:8px" }, t("latest")), recentList(status?.recent)));
  }

  function appPage() {
    const route = routeNow();
    const labelOf = { "": t("home"), faucet: t("faucet"), ptc: t("ptc"), links: t("links"), offers: t("offers"), challenges: t("challenges"), referral: t("referral"), withdraw: t("withdraw"), history: t("history"), security: t("security") };
    const nav = ROUTES.map(([r]) => h("a", { class: "nav", href: `#${r}`, "aria-current": r === route ? "page" : undefined }, labelOf[r]));
    chip = h("div", { class: "balance-chip" });
    updateChip();

    const page = {
      "": dashboardPage, faucet: faucetCard, ptc: ptcPage, links: linksPage, offers: offersPage,
      challenges: () => h("div", { class: "stack" }, h("div", { class: "grid" }, wheelCard(), bonusCard()), challengesCard()),
      referral: referralPage, withdraw: withdrawPage, history: historyPage, security: securityPage,
    }[route]?.() ?? dashboardPage();

    return h("div", { class: "app" },
      h("nav", { class: "side", ariaLabel: "Menu" }, logo(), nav, h("div", { class: "spacer" }),
        h("button", {
          class: "nav", type: "button",
          onclick: async () => {
            await api("logout");
            session = null;
            me = null;
            store.del("cc.session");
            location.hash = "";
            render();
          },
        }, t("logout"))),
      h("div", {},
        h("main", { class: "main" },
          h("div", { class: "main-head" }, h("h1", {}, labelOf[route] ?? t("home")), chip),
          status?.paused ? h("div", { class: "notice warn", style: "margin-bottom:14px" }, t("allPaused")) : null,
          h("div", { class: "stack" }, adSlot("top"), page, adSlot("bottom"))),
        footer()));
  }

  function render() {
    clearTimers();
    const root = document.getElementById("root");
    root.replaceChildren(session && me ? appPage() : homePage());
  }

  async function publicStatus() {
    const r = await api("status");
    return r.code === "offline" || r.ok === false ? null : r;
  }

  async function boot() {
    status = await publicStatus();
    if (session) await refreshMe();

    // Retour d'un lien raccourci
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

  window.addEventListener("hashchange", () => { if (session && me) { refreshMe().then(render); } });
  // Soldes et statut seulement si la page est visible, pour limiter les appels.
  setInterval(async () => {
    if (document.hidden || !status) return;
    const s = await publicStatus();
    if (s) status = s;
    if (session && me) await refreshMe();
  }, 60000);

  background();
  boot();
})();
