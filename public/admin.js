(function () {
  const cfg = window.FAUCET_CONFIG;
  const $ = (id) => document.getElementById(id);
  let password = "";
  try { password = sessionStorage.getItem("faucet.admin") || ""; } catch { /* navigation privée */ }
  let filter = "attention";

  function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children.filter((c) => c !== null && c !== undefined));
    return node;
  }
  const fromUnits = (u, d) => (u === null || u === undefined ? "—" : (Number(u) / 10 ** d).toFixed(d).replace(/\.?0+$/, "") || "0");
  const toUnits = (v, d) => Math.round(parseFloat(v) * 10 ** d);
  const when = (iso) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });

  async function api(action, extra = {}) {
    const res = await fetch(`${cfg.API_BASE}/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ action, ...extra }),
    });
    const body = await res.json();
    if (res.status === 401) throw Object.assign(new Error("Mot de passe incorrect."), { auth: true });
    if (body.code === "admin_not_configured") throw Object.assign(new Error("Le mot de passe admin n'est pas configuré sur le serveur (16 caractères minimum)."), { auth: true });
    if (body.ok === false && !["too_soon", "not_retryable"].includes(body.code) && !body.message) throw new Error(`Erreur : ${body.code}`);
    return body;
  }

  function showError(err) {
    if (err.auth) {
      password = "";
      try { sessionStorage.removeItem("faucet.admin"); } catch { /* navigation privée */ }
      $("app").hidden = true;
      $("login").hidden = false;
      $("login-error").textContent = err.message;
    } else {
      $("app-error").textContent = err.message;
    }
  }

  async function act(fn) {
    $("app-error").textContent = "";
    try { await fn(); await load(); } catch (err) { showError(err); }
  }

  function renderBanner(s, hourCount) {
    const b = $("banner");
    b.className = "banner " + (s.paused ? "off" : "on");
    const text = s.paused ? `Faucet en pause. ${s.pause_reason || ""}` : "Faucet ouvert : les paiements partent.";
    const parts = [el("span", { textContent: text })];
    if (s.paused && hourCount >= s.max_claims_site_hour) {
      parts.push(el("span", { textContent: "Le plafond horaire est encore atteint : augmente-le avant de rouvrir, sinon le faucet se remettra en pause." }));
    }
    const btn = el("button", {
      className: "btn " + (s.paused ? "primary" : "danger"),
      textContent: s.paused ? "Rouvrir le faucet" : "Mettre en pause",
    });
    btn.onclick = () => act(() => api("update_settings", {
      settings: s.paused ? { paused: false } : { paused: true, pause_reason: "Pause manuelle" },
    }));
    parts.push(btn);
    b.replaceChildren(...parts);
  }

  function renderKpis(d) {
    const box = $("kpis");
    box.replaceChildren(
      el("div", {}, el("b", { textContent: d.stats.hour }), "réclamations sur la dernière heure"),
      el("div", {}, el("b", { textContent: d.stats.attention }), "réclamations à vérifier"),
      ...d.stats.day_by_coin.map((r) => {
        const coin = d.coins.find((c) => c.code === r.coin);
        return el("div", {}, el("b", { textContent: `${fromUnits(r.units, coin.decimals)} ${r.coin}` }), `payés sur 24 h (paiements : ${r.count})`);
      }),
    );
    $("balance-note").textContent = d.balance_error
      ? `Soldes non actualisés (${d.balance_error}). Dernières valeurs connues affichées.`
      : "";
  }

  function renderCoins(coins) {
    const head = el("tr", {}, ...["Crypto", "Solde", "Récompense", "Alerte si solde sous", "Active", ""].map((t) => el("th", { textContent: t })));
    const rows = coins.map((c) => {
      const reward = el("input", { type: "number", min: "0", step: "any", value: fromUnits(c.reward_units, c.decimals), ariaLabel: `Récompense ${c.code}` });
      const low = el("input", { type: "number", min: "0", step: "any", value: fromUnits(c.low_balance_units, c.decimals), ariaLabel: `Seuil d'alerte ${c.code}` });
      const on = el("input", { type: "checkbox", checked: c.enabled, ariaLabel: `Activer ${c.code}` });
      const save = el("button", { className: "btn small", textContent: "Enregistrer" });
      save.onclick = () => act(() => api("update_coin", {
        code: c.code,
        coin: {
          enabled: on.checked,
          reward_units: toUnits(reward.value || "0", c.decimals),
          low_balance_units: toUnits(low.value || "0", c.decimals),
        },
      }));
      return el("tr", {},
        el("td", {}, el("b", { textContent: c.code }), ` ${c.name}`),
        el("td", { className: "mono", textContent: fromUnits(c.last_balance_units, c.decimals) }),
        el("td", {}, reward), el("td", {}, low), el("td", {}, on), el("td", {}, save));
    });
    $("coins-table").replaceChildren(el("thead", {}, head), el("tbody", {}, ...rows));
  }

  function renderSettings(s) {
    const form = $("settings-form");
    for (const k of ["cooldown_seconds", "max_claims_account_day", "max_claims_ip_day", "max_claims_site_hour"]) {
      if (document.activeElement !== form.elements[k]) form.elements[k].value = s[k];
    }
  }

  const STATUS = { paid: "Payée", failed: "Refusée", unknown: "Sans réponse", reserved: "En cours" };

  async function loadClaims() {
    const { claims } = await api("claims", { filter });
    document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("primary", b.dataset.filter === filter));
    const head = el("tr", {}, ...["Date", "Compte", "Montant", "État", "Détail", "Actions"].map((t) => el("th", { textContent: t })));
    const rows = claims.map((c) => {
      const actions = el("div", { className: "row-actions" });
      if (c.status === "unknown" || c.status === "reserved") {
        const retry = el("button", { className: "btn small primary", textContent: "Relancer" });
        retry.title = "Sans risque de double paiement : FaucetPay reconnaît la réclamation.";
        retry.onclick = () => act(async () => {
          const r = await api("retry", { id: c.id });
          if (r.code === "too_soon") throw new Error("Attends une minute après la réclamation avant de relancer.");
          if (r.ok === false) throw new Error(`Relance refusée : ${r.message || r.code}`);
        });
        actions.append(retry);
      }
      const ban = (label, kind, value) => {
        if (!value) return;
        const b = el("button", { className: "btn small", textContent: label });
        b.onclick = () => act(() => api("ban", { kind, value, reason: `Réclamation du ${when(c.created_at)}` }));
        actions.append(b);
      };
      ban("Bannir l'adresse", "address", c.address_norm);
      ban("Bannir l'IP", "ip", c.ip_hash);
      ban("Bannir le compte", "account", c.user_hash);
      return el("tr", {},
        el("td", { textContent: when(c.created_at) }),
        el("td", { className: "mono wrap", textContent: c.address }),
        el("td", { className: "mono", textContent: `${fromUnits(c.amount_units, c.decimals)} ${c.coin}` }),
        el("td", {}, el("span", { className: `pill ${c.status}`, textContent: STATUS[c.status] })),
        el("td", { className: "wrap", textContent: c.payout_id ? `n° ${c.payout_id}` : (c.error || "") }),
        el("td", {}, actions));
    });
    $("claims-table").replaceChildren(el("thead", {}, head), el("tbody", {}, ...rows));
    $("claims-table").hidden = rows.length === 0;
    $("claims-empty").hidden = rows.length > 0;
  }

  function renderBans(bans) {
    const names = { address: "Adresse", ip: "IP (chiffrée)", account: "Compte FaucetPay" };
    const rows = bans.map((b) => {
      const un = el("button", { className: "btn small", textContent: "Lever" });
      un.onclick = () => act(() => api("unban", { kind: b.kind, value: b.value }));
      return el("tr", {},
        el("td", { textContent: names[b.kind] }),
        el("td", { className: "mono wrap", textContent: b.value }),
        el("td", { textContent: b.reason || "" }),
        el("td", {}, un));
    });
    $("bans-table").replaceChildren(el("tbody", {}, ...rows));
    $("bans-table").hidden = rows.length === 0;
    $("bans-empty").hidden = rows.length > 0;
  }

  async function load() {
    const d = await api("overview");
    $("login").hidden = true;
    $("app").hidden = false;
    renderBanner(d.settings, d.stats.hour);
    renderKpis(d);
    renderCoins(d.coins);
    renderSettings(d.settings);
    renderBans(d.bans);
    await loadClaims();
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    password = $("password").value;
    $("login-error").textContent = "";
    try {
      await load();
      try { sessionStorage.setItem("faucet.admin", password); } catch { /* navigation privée */ }
    } catch (err) {
      showError(err.auth ? err : Object.assign(err, { auth: true }));
    }
  });

  $("settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const n = (k) => Number(f[k].value);
    act(() => api("update_settings", {
      settings: {
        cooldown_seconds: n("cooldown_seconds"),
        max_claims_account_day: n("max_claims_account_day"),
        max_claims_ip_day: n("max_claims_ip_day"),
        max_claims_site_hour: n("max_claims_site_hour"),
      },
    }));
  });

  $("refresh").onclick = () => act(async () => {});
  document.querySelectorAll("[data-filter]").forEach((b) => {
    b.onclick = () => { filter = b.dataset.filter; act(async () => {}); };
  });

  if (password) load().catch(showError);
})();
