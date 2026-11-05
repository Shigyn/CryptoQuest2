(function () {
  const cfg = window.FAUCET_CONFIG;
  const $ = (id) => document.getElementById(id);

  const TEXT = {
    fr: {
      title: "Ouvre le robinet.",
      lede: (amount, min) => `<strong>${amount}</strong> toutes les ${min}, versés tout de suite sur ton compte FaucetPay.`,
      ledeEmpty: "Reçois de la crypto gratuitement sur ton compte FaucetPay.",
      addressLabel: "Ton e-mail, pseudo ou adresse FaucetPay",
      placeholder: "toi@exemple.com",
      claim: (amount) => `Recevoir ${amount}`,
      wait: (t) => `Prochaine réclamation dans ${t}`,
      sending: "Envoi en cours…",
      closed: "Robinet fermé",
      recent: "Derniers paiements",
      legal: "Mentions et confidentialité",
      fp: "Créer un compte FaucetPay",
      min: (n) => (n === 1 ? "minute" : `${n} minutes`),
      sec: (n) => `${n} secondes`,
      ago: { now: "à l'instant", min: (n) => `il y a ${n} min`, h: (n) => `il y a ${n} h`, d: (n) => `il y a ${n} j` },
      paid: (amount, id) => `${amount} envoyés sur ton compte FaucetPay. Paiement n° ${id}.`,
      needAddress: "Saisis ton e-mail, pseudo ou adresse FaucetPay.",
      needCaptcha: "Valide le captcha, puis appuie de nouveau.",
      noCoin: "Aucune crypto n'est disponible pour le moment. Reviens plus tard.",
      offline: "Le robinet ne répond pas. Vérifie ta connexion et réessaie.",
      errors: {
        captcha: "Le captcha a échoué. Valide-le de nouveau.",
        invalid_address: "FaucetPay ne connaît pas ce compte pour cette crypto. Vérifie ton identifiant ou change de crypto.",
        cooldown: "Patiente jusqu'à la fin du compte à rebours.",
        daily_limit: "Limite quotidienne atteinte. Reviens demain.",
        banned: "Ce compte ne peut plus réclamer ici.",
        paused: "Le robinet est fermé pour le moment. Reviens plus tard.",
        coin_empty: "Cette crypto est à sec. Choisis-en une autre ou reviens plus tard.",
        coin_unavailable: "Cette crypto n'est plus disponible. Choisis-en une autre.",
        pending: "FaucetPay n'a pas encore confirmé ton paiement. Vérifie ton compte dans quelques minutes.",
        try_later: "FaucetPay est occupé. Réessaie dans une minute.",
      },
    },
    en: {
      title: "Turn on the tap.",
      lede: (amount, min) => `<strong>${amount}</strong> every ${min}, sent straight to your FaucetPay account.`,
      ledeEmpty: "Get free crypto on your FaucetPay account.",
      addressLabel: "Your FaucetPay email, username or address",
      placeholder: "you@example.com",
      claim: (amount) => `Get ${amount}`,
      wait: (t) => `Next claim in ${t}`,
      sending: "Sending…",
      closed: "Tap closed",
      recent: "Latest payouts",
      legal: "Legal and privacy",
      fp: "Create a FaucetPay account",
      min: (n) => (n === 1 ? "minute" : `${n} minutes`),
      sec: (n) => `${n} seconds`,
      ago: { now: "just now", min: (n) => `${n} min ago`, h: (n) => `${n} h ago`, d: (n) => `${n} d ago` },
      paid: (amount, id) => `${amount} sent to your FaucetPay account. Payout #${id}.`,
      needAddress: "Enter your FaucetPay email, username or address.",
      needCaptcha: "Complete the captcha, then press again.",
      noCoin: "No coin is available right now. Come back later.",
      offline: "The tap isn't responding. Check your connection and try again.",
      errors: {
        captcha: "The captcha failed. Complete it again.",
        invalid_address: "FaucetPay doesn't know this account for this coin. Check your ID or pick another coin.",
        cooldown: "Wait until the countdown ends.",
        daily_limit: "Daily limit reached. Come back tomorrow.",
        banned: "This account can no longer claim here.",
        paused: "The tap is closed for now. Come back later.",
        coin_empty: "This coin has run dry. Pick another or come back later.",
        coin_unavailable: "This coin is no longer available. Pick another.",
        pending: "FaucetPay hasn't confirmed your payout yet. Check your account in a few minutes.",
        try_later: "FaucetPay is busy. Try again in a minute.",
      },
    },
  };

  const lang = (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
  const t = TEXT[lang];
  document.documentElement.lang = lang;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } },
  };

  let status = null;
  let coin = store.get("faucet.coin");
  let readyAt = Number(store.get("faucet.readyAt")) || 0;
  let cycleSeconds = 0;
  let busy = false;
  let captchaWidget = null;
  let captchaToken = "";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function format(units, decimals) {
    return (units / 10 ** decimals).toFixed(decimals).replace(/\.?0+$/, "");
  }
  const selected = () => status?.coins.find((c) => c.code === coin);
  const label = (c) => `${format(c.reward_units, c.decimals)} ${c.code}`;

  function duration(seconds) {
    if (seconds < 60) return t.sec(seconds);
    return t.min(Math.round(seconds / 60));
  }

  function clock(seconds) {
    const m = Math.floor(seconds / 60);
    return `${m}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function say(text, kind) {
    const m = $("message");
    m.textContent = text;
    m.className = "message" + (kind ? " " + kind : "");
  }

  function setWater(fraction, animated) {
    const w = $("water");
    w.classList.toggle("draining", Boolean(animated));
    w.style.height = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  }

  function startCooldown(seconds) {
    cycleSeconds = status?.cooldown_seconds || seconds;
    readyAt = Date.now() + seconds * 1000;
    store.set("faucet.readyAt", String(readyAt));
    store.set("faucet.cycle", String(cycleSeconds));
  }

  function render() {
    const c = selected();
    const left = Math.ceil((readyAt - Date.now()) / 1000);
    const tap = $("tap");

    if (left > 0) {
      const total = cycleSeconds || Number(store.get("faucet.cycle")) || left;
      if (!$("water").classList.contains("draining")) setWater(1 - left / total);
    } else if (!$("water").classList.contains("draining")) {
      setWater(1);
    }

    if (busy) {
      tap.disabled = true;
      tap.textContent = t.sending;
    } else if (status?.paused) {
      tap.disabled = true;
      tap.textContent = t.closed;
    } else if (left > 0) {
      tap.disabled = true;
      tap.textContent = t.wait(clock(left));
    } else if (!c) {
      tap.disabled = true;
      tap.textContent = t.closed;
    } else {
      tap.disabled = false;
      tap.textContent = t.claim(label(c));
    }
  }

  function renderCoins() {
    const box = $("coins");
    box.replaceChildren();
    for (const c of status.coins) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "coin";
      b.textContent = c.code;
      b.title = c.name;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(c.code === coin));
      b.addEventListener("click", () => {
        coin = c.code;
        store.set("faucet.coin", coin);
        renderCoins();
        renderLede();
        render();
      });
      box.append(b);
    }
    box.hidden = status.coins.length < 2;
  }

  function renderLede() {
    const c = selected();
    const lede = $("lede");
    if (!c || !status) {
      lede.textContent = t.ledeEmpty;
      return;
    }
    const strong = document.createElement("span");
    strong.innerHTML = t.lede("\u0000", duration(status.cooldown_seconds));
    strong.querySelector("strong").textContent = label(c);
    lede.replaceChildren(...strong.childNodes);
  }

  function ago(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return t.ago.now;
    if (s < 3600) return t.ago.min(Math.floor(s / 60));
    if (s < 86400) return t.ago.h(Math.floor(s / 3600));
    return t.ago.d(Math.floor(s / 86400));
  }

  function renderRecent() {
    const list = $("recent");
    list.replaceChildren();
    for (const r of status.recent) {
      const li = document.createElement("li");
      const who = document.createElement("span");
      who.textContent = r.who;
      const amount = document.createElement("span");
      amount.textContent = `${format(r.amount_units, r.decimals)} ${r.coin}`;
      const when = document.createElement("time");
      when.textContent = ago(r.at);
      li.append(who, amount, when);
      list.append(li);
    }
    $("recent-card").hidden = status.recent.length === 0;
  }

  async function loadStatus() {
    try {
      const res = await fetch(`${cfg.API_BASE}/status`);
      if (!res.ok) throw new Error(String(res.status));
      status = await res.json();
    } catch {
      if (!status) say(t.offline, "bad");
      return;
    }
    if (!selected()) coin = status.coins[0]?.code ?? null;
    if (!status.coins.length && !status.paused) say(t.noCoin);
    if (status.paused) say(t.errors.paused);
    else if ($("message").textContent === t.errors.paused || $("message").textContent === t.noCoin) {
      if (status.coins.length) say("");
    }
    renderCoins();
    renderLede();
    renderRecent();
    render();
  }

  function resetCaptcha() {
    captchaToken = "";
    if (window.turnstile && captchaWidget !== null) window.turnstile.reset(captchaWidget);
  }

  async function claim(event) {
    event.preventDefault();
    const address = $("address").value.trim();
    if (!address) { say(t.needAddress, "bad"); $("address").focus(); return; }
    if (!captchaToken) { say(t.needCaptcha, "bad"); return; }
    const c = selected();
    if (!c || busy) return;

    busy = true;
    say("");
    render();
    store.set("faucet.address", address);

    try {
      const res = await fetch(`${cfg.API_BASE}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin: c.code, address, captcha: captchaToken }),
      });
      const body = await res.json();
      if (body.ok) {
        say(t.paid(`${format(body.amount_units, body.decimals)} ${body.coin}`, body.payout_id), "good");
        startCooldown(status.cooldown_seconds);
        setWater(0, !reduceMotion);
        setTimeout(() => { $("water").classList.remove("draining"); render(); }, 950);
        loadStatus();
      } else {
        say(t.errors[body.code] || t.errors.try_later, body.code === "pending" ? "" : "bad");
        if (body.retry_after) startCooldown(body.retry_after);
        if (body.code === "pending") startCooldown(status.cooldown_seconds);
        if (["paused", "coin_empty", "coin_unavailable"].includes(body.code)) loadStatus();
      }
    } catch {
      say(t.offline, "bad");
    } finally {
      busy = false;
      resetCaptcha();
      render();
    }
  }

  function setupCaptcha() {
    window.onTurnstileReady = () => {
      captchaWidget = window.turnstile.render("#captcha", {
        sitekey: cfg.TURNSTILE_SITE_KEY,
        language: lang,
        callback: (token) => { captchaToken = token; },
        "expired-callback": () => { captchaToken = ""; },
        "error-callback": () => { captchaToken = ""; },
      });
    };
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady";
    s.async = true;
    document.head.append(s);
  }

  function setupAds() {
    for (const slot of ["top", "bottom"]) {
      const html = cfg.ADS?.[slot];
      if (!html) continue;
      const box = $(`ad-${slot}`);
      // Range.createContextualFragment exécute les scripts du réseau publicitaire.
      box.append(document.createRange().createContextualFragment(html));
      box.hidden = false;
    }
  }

  // Textes fixes
  document.title = cfg.SITE_NAME;
  $("brand").textContent = cfg.SITE_NAME;
  $("title").textContent = t.title;
  $("lede").textContent = t.ledeEmpty;
  $("address-label").textContent = t.addressLabel;
  $("address").placeholder = t.placeholder;
  $("address").value = store.get("faucet.address") || "";
  $("recent-title").textContent = t.recent;
  $("legal-link").textContent = t.legal;
  $("fp-link").textContent = t.fp;
  $("form").addEventListener("submit", claim);

  render();
  setupCaptcha();
  setupAds();
  loadStatus();

  setInterval(render, 1000);
  // Le statut ne se recharge que si la page est visible, pour limiter les appels.
  setInterval(() => { if (!document.hidden) loadStatus(); }, 60000);
})();
