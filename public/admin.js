import { BASE, SCENARIOS, simulate } from "./simulation.mjs";

const cfg = window.FAUCET_CONFIG;
const TK = cfg.TOKEN;
let password = "";
try { password = sessionStorage.getItem("cc.admin") || ""; } catch { /* navigation privee */ }

function h(tag, props, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  node.append(...kids.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

const fmt = (n) => Number(n ?? 0).toLocaleString("fr-FR");
const money = (n, digits = 2) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " €";
const fromUnits = (u, d) => (u === null || u === undefined ? "—" : (Number(u) / 10 ** d).toFixed(d).replace(/\.?0+$/, "") || "0");
const toUnits = (v, d) => Math.round(parseFloat(v || "0") * 10 ** d);
const when = (iso) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });

let data = null;
let tab = "overview";
let errorText = "";

async function api(action, extra = {}) {
  const res = await fetch(`${cfg.API_BASE}/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": password },
    body: JSON.stringify({ action, ...extra }),
  });
  const body = await res.json();
  if (res.status === 401) throw Object.assign(new Error("Mot de passe incorrect."), { auth: true });
  if (body.code === "admin_not_configured") throw Object.assign(new Error("Le mot de passe admin n'est pas configuré sur le serveur (16 caractères minimum)."), { auth: true });
  return body;
}

function fail(err) {
  if (err.auth) {
    password = "";
    data = null;
    try { sessionStorage.removeItem("cc.admin"); } catch { /* navigation privee */ }
    errorText = err.message;
    render();
  } else {
    errorText = err.message;
    render();
  }
}

// Execute une action, recharge, reaffiche.
async function act(fn) {
  errorText = "";
  try {
    await fn();
    data = await api("overview");
  } catch (err) {
    errorText = err.message;
    if (err.auth) return fail(err);
  }
  render();
}

function saveButton(label, fn, cls = "btn small") {
  return h("button", { class: cls, type: "button", onclick: () => act(fn) }, label);
}

const card = (title, ...kids) => h("section", { class: "card" }, title ? h("h2", { style: "margin-bottom:10px" }, title) : null, ...kids);
const stat = (value, label) => h("div", { class: "card stat" }, h("b", {}, value), label);
const empty = (text) => h("p", { class: "muted" }, text);

function table(heads, rows, emptyText) {
  if (!rows.length) return empty(emptyText);
  return h("div", { class: "table-wrap" }, h("table", {},
    h("thead", {}, h("tr", {}, heads.map((t) => h("th", {}, t)))),
    h("tbody", {}, rows.map((cells) => h("tr", {}, cells.map((c) => (c instanceof Node && c.tagName === "TD" ? c : h("td", {}, c))))))));
}

// Vue d'ensemble -----------------------------------------------------------
function overviewTab() {
  const s = data.settings;
  const st = data.stats;
  const usdt = data.coins.find((c) => c.code === "USDT");
  const debt = Number(st.tokens_available) + Number(st.tokens_pending) + Number(st.tokens_validated);
  const debtEur = debt / s.tokens_per_eur;
  const balanceEur = usdt?.last_balance_units != null && usdt.per_eur ? usdt.last_balance_units / 10 ** usdt.decimals / usdt.per_eur : null;
  return h("div", { class: "stack" },
    h("div", { class: "grid" },
      stat(fmt(st.users), "membres"),
      stat(fmt(st.claims_hour), `réclamations sur 1 h (plafond ${fmt(s.max_claims_site_hour)})`),
      stat(fmt(st.claims_day), "réclamations sur 24 h"),
      stat(fmt(st.earnings_to_review), "gains à valider"),
      stat(fmt(st.attention), "retraits à vérifier"),
      stat(fmt(st.vip_active), `VIP actifs · ${money(st.vip_paid_eur_30d)} sur 30 j`),
      stat(fmt(st.shop_tokens_30d || 0), `${TK} dépensés en boutique sur 30 j · tournoi ${fmt(st.tournament_tokens_30d || 0)}`),
      stat(money(st.paid_tokens_day / s.tokens_per_eur, 4), `payés sur 24 h (plafond ${money(s.max_payout_eur_day)})`)),
    card("Trésorerie",
      h("div", { class: "grid" },
        h("div", { class: "stat" }, h("b", {}, money(debtEur, 4)), `dette envers les membres (${fmt(debt)} ${TK})`),
        h("div", { class: "stat" }, h("b", {}, balanceEur === null ? "—" : money(balanceEur, 4)), "solde USDT du faucet, converti en euros"),
        h("div", { class: "stat" }, h("b", {}, balanceEur === null ? "—" : money(balanceEur - debtEur, 4)), "marge après paiement de toute la dette")),
      balanceEur !== null && balanceEur < debtEur ? h("div", { class: "notice bad", style: "margin-top:12px" }, "Ton solde ne couvre pas la dette. Recharge le faucet ou baisse les récompenses.") : null,
      data.balance_error ? h("div", { class: "notice warn", style: "margin-top:12px" }, `Soldes non actualisés : ${data.balance_error}.`) : null),
    card("Paiement horaire",
      h("p", { class: "muted", style: "margin-bottom:10px" }, `${fmt(st.tokens_validated)} ${TK} validés partiront au prochain lot. Le lot part seul chaque heure, une fois la tâche planifiée créée (voir le guide).`),
      saveButton("Lancer le lot maintenant", async () => {
        const r = await api("run_batch");
        if (r.ok === false) throw new Error(r.code);
        errorText = "";
        window.lastBatch = `Lot : ${r.paid} payés, ${r.failed} refusés, ${r.skipped} ignorés.`;
      }, "btn"),
      window.lastBatch ? h("p", { class: "muted", style: "margin-top:8px" }, window.lastBatch) : null));
}

// A valider ----------------------------------------------------------------
const SOURCE = { ptc: "PTC", shortlink: "Lien", offer: "Offre" };
function earningsTab() {
  const box = h("div", {}, empty("Chargement…"));
  api("earnings", { status: "pending" }).then(({ earnings }) => {
    const clean = earnings.filter((e) => !e.risk).length;
    box.replaceChildren(
      h("div", { class: "row between", style: "margin-bottom:10px" },
        h("p", { class: "muted" }, `${earnings.length} gains en attente, dont ${earnings.length - clean} signalés. Les gains signalés se valident un par un.`),
        saveButton(`Tout valider sauf les signalés (${clean})`, () => api("validate", { all_clean: true }), "btn")),
      table(["Date", "Membre", "Origine", TK, "Alerte", "Actions"], earnings.map((e) => [
        when(e.created_at),
        h("td", { class: "wrap mono" }, e.member),
        `${SOURCE[e.source]} · ${e.label ?? ""}`,
        fmt(e.tokens),
        e.risk ? h("span", { class: "pill warn" }, e.risk) : "",
        h("div", { class: "row" },
          saveButton("Valider", () => api("validate", { ids: [e.id] })),
          saveButton("Refuser", () => api("reject", { ids: [e.id] }))),
      ]), "Aucun gain à valider."));
  }).catch(fail);
  return card("Gains à valider", box);
}

// Retraits -----------------------------------------------------------------
let wdFilter = "all";
const WD = { paid: ["Payé", "good"], failed: ["Refusé", "bad"], unknown: ["Sans réponse", "warn"], reserved: ["En cours", "warn"] };
function withdrawalsTab() {
  const box = h("div", {}, empty("Chargement…"));
  const filterBtn = (f, label) => h("button", {
    class: `btn small ${wdFilter === f ? "" : "ghost"}`, type: "button",
    onclick: () => { wdFilter = f; render(); },
  }, label);
  api("withdrawals", { filter: wdFilter }).then(({ withdrawals }) => {
    box.replaceChildren(table(["Date", "Membre", "Type", TK, "Montant", "État", "Détail", ""], withdrawals.map((w) => [
      when(w.created_at),
      h("td", { class: "wrap mono" }, w.member),
      w.kind === "instant" ? "Immédiat" : "Horaire",
      fmt(w.tokens),
      h("td", { class: "mono" }, `${fromUnits(w.amount_units, w.decimals)} ${w.coin}`),
      h("span", { class: `pill ${WD[w.status][1]}` }, WD[w.status][0]),
      h("td", { class: "wrap" }, w.payout_id ? `n° ${w.payout_id}` : (w.error ?? "")),
      ["unknown", "reserved"].includes(w.status) ? saveButton("Relancer", async () => {
        const r = await api("retry", { id: w.id });
        if (r.code === "too_soon") throw new Error("Attends une minute après le retrait avant de relancer.");
        if (r.ok === false) throw new Error(`Relance refusée : ${r.message || r.code}`);
      }) : "",
    ]), "Aucun retrait dans cette liste."));
  }).catch(fail);
  return card("Retraits",
    h("div", { class: "row", style: "margin-bottom:10px" }, filterBtn("all", "Tous"), filterBtn("attention", "À vérifier"), filterBtn("paid", "Payés"), filterBtn("failed", "Refusés")),
    box);
}

// Membres ------------------------------------------------------------------
let userSearch = "";
function usersTab() {
  const box = h("div", {}, empty("Chargement…"));
  const load = () => api("users", { search: userSearch }).then(({ users }) => {
    box.replaceChildren(table(["Compte FaucetPay", "Mot de passe", "Dispo", "À valider", "Validé", "Réclam.", "IP partagée", "Actions"], users.map((u) => [
      h("td", { class: "wrap mono" }, u.fp_address, u.banned ? h("span", { class: "pill bad", style: "margin-left:6px" }, "Banni") : null),
      u.secured ? "Oui" : "Non",
      fmt(u.available), fmt(u.pending), fmt(u.validated), fmt(u.claims),
      u.same_ip > 0 ? h("span", { class: "pill warn" }, `${u.same_ip} autre(s)`) : "",
      h("div", { class: "row" },
        u.banned
          ? saveButton("Débannir", () => api("ban_user", { id: u.id, banned: false }))
          : saveButton("Bannir", () => api("ban_user", { id: u.id, banned: true, reason: "Décision admin" })),
        u.last_ip_hash ? saveButton("Bannir l'IP", () => api("ban", { kind: "ip", value: u.last_ip_hash, reason: u.fp_address })) : null,
        u.fp_user_hash ? saveButton("Bannir le compte FP", () => api("ban", { kind: "account", value: u.fp_user_hash, reason: u.fp_address })) : null),
    ]), "Aucun membre trouvé."));
  }).catch(fail);
  load();
  return h("div", { class: "stack" },
    card("Membres",
      h("form", { class: "row", style: "margin-bottom:10px", onsubmit: (e) => { e.preventDefault(); userSearch = e.target.elements.q.value; load(); } },
        h("input", { name: "q", value: userSearch, placeholder: "Compte FaucetPay", style: "flex:1;min-width:200px;margin:0", ariaLabel: "Rechercher" }),
        h("button", { class: "btn" }, "Rechercher")),
      box),
    card("Bannissements",
      table(["Type", "Valeur", "Raison", ""], data.bans.map((b) => [
        b.kind === "ip" ? "IP (chiffrée)" : "Compte FaucetPay",
        h("td", { class: "wrap mono" }, b.value),
        b.reason ?? "",
        saveButton("Lever", () => api("unban", { kind: b.kind, value: b.value })),
      ]), "Aucun bannissement.")));
}

// Reglages -----------------------------------------------------------------
const FIELDS = [
  ["faucet_reward_tokens", `Récompense du faucet (${TK})`],
  ["cooldown_seconds", "Délai minimum entre deux tirages (secondes)"],
  ["claims_window_count", "Tirages au plus par période"],
  ["claims_window_seconds", "Durée de cette période (secondes, 600 = 10 min)"],
  ["max_claims_account_day", "Réclamations par compte, sur 24 h"],
  ["max_claims_ip_day", "Réclamations par IP, sur 24 h"],
  ["max_claims_site_hour", "Coupe-circuit : réclamations du site par heure"],
  ["max_payout_eur_day", "Coupe-circuit : paiements du site par 24 h (€)"],
  ["max_signups_ip_day", "Inscriptions par IP, sur 24 h"],
  ["daily_bonus_tokens", `Bonus quotidien (${TK})`],
  ["daily_bonus_min_claims", "Réclamations requises pour le bonus"],
  ["wheel_min_claims", "Réclamations requises pour la roue du jour"],
  ["wheel_hours", "Roue : un tour toutes les X heures"],
  ["mines_daily_plays", "Mines : parties gratuites par jour"],
  ["dice_daily_plays", "Dice : lancers gratuits par jour"],
  ["dice_unit", `Dice : gain de base (${TK}, multiplié par 100 / cible)`],
  ["ad_price_eur_per_view", "Annonceurs : prix d'une vue de 10 s (€)"],
  ["ad_reward_share", "Annonceurs : part reversée aux membres (%)"],
  ["referral_percent", "Part du parrain (%)"],
  ["vip_price_eur", "VIP : prix de l'abonnement (€)"],
  ["vip_days", "VIP : durée (jours)"],
  ["vip_task_bonus", "VIP : bonus sur pubs, liens et offres (%)"],
  ["vip_referral_percent", "VIP : part du parrain (%)"],
  ["offer_share_percent", "Part des offerwalls reversée (%)"],
  ["boost_price_tokens", `Boutique : prix du boost (${TK})`],
  ["boost_percent", "Boutique : bonus du boost sur tâches, bonus quotidien et quêtes (%)"],
  ["boost_hours", "Boutique : durée du boost (heures)"],
];

function settingsTab() {
  const s = data.settings;
  const inputs = Object.fromEntries(FIELDS.map(([k]) => [k, h("input", { type: "number", min: "0", step: "any", value: s[k], required: true })]));
  const prizes = h("input", { value: (s.wheel_prizes || []).join(", "), required: true, pattern: "[0-9 ,]+" });
  const prizeList = () => prizes.value.split(",").map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n >= 0);
  const mines = h("input", { value: (s.mines_rewards || []).join(", "), required: true, pattern: "[0-9 ,]+" });
  const tourney = h("input", { value: (s.tournament_prizes || []).join(", "), required: true, pattern: "[0-9 ,]+" });
  const tourneyList = () => tourney.value.split(",").map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n >= 0);
  const minesList = () => mines.value.split(",").map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n >= 0);
  return h("div", { class: "stack" },
    card("Récompenses et plafonds",
      h("p", { class: "muted", style: "margin-bottom:12px" }, `Taux fixe : ${fmt(s.tokens_per_eur)} ${TK} = 1 €.`),
      h("form", {
        onsubmit: (e) => {
          e.preventDefault();
          const list = prizeList();
          if (list.length < 2 || list.length > 16) { errorText = "La roue doit avoir entre 2 et 16 cases."; render(); return; }
          const ml = minesList();
          if (ml.length < 1 || ml.length > 20) { errorText = "Mines doit avoir entre 1 et 20 gains."; render(); return; }
          const tl = tourneyList();
          if (tl.length < 1 || tl.length > 50) { errorText = "Le tournoi doit avoir entre 1 et 50 prix."; render(); return; }
          act(() => api("update_settings", { settings: { ...Object.fromEntries(FIELDS.map(([k]) => [k, Number(inputs[k].value)])), wheel_prizes: list, mines_rewards: ml, tournament_prizes: tl } }));
        },
      },
        h("div", { class: "grid" }, FIELDS.map(([k, label]) => h("label", { class: "field" }, label, inputs[k]))),
        h("label", { class: "field" }, `Cases de la roue du jour (${TK}, séparées par des virgules, chaque case a la même chance)`, prizes),
        h("p", { class: "muted", style: "margin:-4px 0 12px" }, `Gain moyen actuel : ${(prizeList().reduce((a, b) => a + b, 0) / Math.max(prizeList().length, 1)).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${TK} par membre et par jour.`),
        h("label", { class: "field" }, `Mines : gain selon le nombre de cases ouvertes (${TK}, séparés par des virgules)`, mines),
        h("label", { class: "field" }, `Tournoi de la semaine : prix par place, de la 1re à la dernière payée (${TK}, séparés par des virgules)`, tourney),
        h("p", { class: "muted", style: "margin:-4px 0 12px" }, `Coût par semaine : ${fmt(tourneyList().reduce((a, b) => a + b, 0))} ${TK} = ${money(tourneyList().reduce((a, b) => a + b, 0) / s.tokens_per_eur)}.`),
        h("button", { class: "btn" }, "Enregistrer les réglages"))),
    card("Cryptos de retrait",
      h("div", { class: "row between", style: "margin-bottom:12px" },
        h("label", { class: "row", style: "font-weight:700;color:var(--ink)" },
          h("input", { type: "checkbox", checked: s.auto_rates, onchange: (e) => act(() => api("update_settings", { settings: { auto_rates: e.target.checked } })) }),
          "Taux automatiques, mis à jour chaque heure (CoinGecko)"),
        saveButton("Actualiser les taux maintenant", async () => {
          const r = await api("refresh_rates");
          if (r.error) throw new Error(r.error);
          if (r.skipped?.length) throw new Error(`Taux gardés pour ${r.skipped.join(", ")} : prix absent ou écart de plus de 50 %.`);
        }, "btn small ghost")),
      table(["Crypto", "Solde", "Combien pour 1 €", "Mis à jour", "Alerte si solde sous", "Active", ""], data.coins.map((c) => {
        const rate = h("input", { type: "number", min: "0", step: "any", value: c.per_eur ?? "", ariaLabel: `Taux ${c.code}` });
        const low = h("input", { type: "number", min: "0", step: "any", value: fromUnits(c.low_balance_units, c.decimals), ariaLabel: `Seuil ${c.code}` });
        const on = h("input", { type: "checkbox", checked: c.enabled, ariaLabel: `Activer ${c.code}` });
        return [
          h("span", {}, h("b", {}, c.code), ` ${c.name}`),
          h("td", { class: "mono" }, fromUnits(c.last_balance_units, c.decimals)),
          rate, c.rate_updated_at ? when(c.rate_updated_at) : (c.price_id ? "En attente" : "Manuel"), low, on,
          saveButton("Enregistrer", () => api("update_coin", { code: c.code, coin: { enabled: on.checked, per_eur: rate.value ? Number(rate.value) : null, low_balance_units: toUnits(low.value, c.decimals) } })),
        ];
      }), ""),
      h("p", { class: "muted", style: "margin-top:10px" }, "Avec les taux automatiques, la valeur saisie est remplacée à chaque heure. Un écart de plus de 50 % est ignoré et signalé. Teste chaque crypto avec un petit retrait avant de l'annoncer.")));
}

// Contenus -----------------------------------------------------------------
function addForm(fields, label, onSave) {
  // type : "text", "number", "url", ou une liste [valeur, libelle] pour un menu deroulant.
  const inputs = fields.map(([key, name, type, value]) => [key, Array.isArray(type)
    ? h("select", {}, type.map(([v, l]) => h("option", { value: v, selected: v === value }, l)))
    : h("input", { type: type || "text", required: true, value: value ?? "", step: "any", min: type === "number" ? "0" : undefined })]);
  return h("form", {
    style: "margin-top:14px",
    onsubmit: (e) => {
      e.preventDefault();
      const item = Object.fromEntries(inputs.map(([k, el]) => [k, el.type === "number" ? Number(el.value) : el.value]));
      act(() => onSave(item));
    },
  },
    h("div", { class: "grid" }, fields.map(([key, name], i) => h("label", { class: "field" }, name, inputs[i][1]))),
    h("button", { class: "btn" }, label));
}

const toggle = (item, action, idKey = "id") => saveButton(item.enabled ? "Désactiver" : "Activer", () => api(action, { item: { [idKey]: item[idKey], enabled: !item.enabled } }));
const statePill = (on) => h("span", { class: `pill ${on ? "good" : ""}` }, on ? "Actif" : "Inactif");

const WALL_KINDS = [["offers", "Offres"], ["surveys", "Sondages"]];
const GOALS = [["claims", "Tirages"], ["earned", `${TK} gagnés`], ["ptc", "Pubs vues"], ["links", "Liens passés"], ["surveys", "Sondages terminés"], ["offers", "Offres terminées"]];

function contentTab() {
  const postbackUrl = `${cfg.API_BASE || "https://VOTRE-PROJET.supabase.co/functions/v1"}/postback`;
  return h("div", { class: "stack" },
    card("PTC : pubs payantes",
      table(["Titre", "Récompense", "Durée", "Vues", "Prix par vue", "État", ""], data.ptc.map((p) => [
        h("td", { class: "wrap" }, p.title, h("div", { class: "hint" }, h("a", { href: p.url, target: "_blank", rel: "noopener noreferrer" }, p.url))), `${fmt(p.reward_tokens)} ${TK}`, `${p.duration_seconds} s`, `${fmt(p.views)} / ${fmt(p.max_views)}`, money(p.price_eur_per_view, 4),
        p.needs_review ? h("span", { class: "pill warn" }, "À approuver") : statePill(p.enabled),
        p.needs_review
          ? h("div", { class: "row" },
              saveButton("Approuver", () => api("save_ptc", { item: { id: p.id, enabled: true } }), "btn small"),
              saveButton("Refuser", () => api("save_ptc", { item: { id: p.id, enabled: false } }), "btn small danger"))
          : toggle(p, "save_ptc"),
      ]), "Aucune campagne pour le moment. Ajoute celle d'un annonceur ci-dessous."),
      addForm([
        ["title", "Titre"], ["url", "Adresse de la pub (https://…)", "url"], ["reward_tokens", `Récompense (${TK})`, "number", 10],
        ["duration_seconds", "Durée (secondes)", "number", 10], ["max_views", "Nombre de vues payées", "number", 1000], ["price_eur_per_view", "Ce que paie l'annonceur par vue (€)", "number", 0.002],
      ], "Ajouter la campagne", (item) => api("save_ptc", { item }))),
    card("Liens raccourcis",
      table(["Réseau", "Récompense", "Par jour", "Revenu par vue", "État", ""], data.shortlinks.map((p) => [
        p.name, `${fmt(p.reward_tokens)} ${TK}`, fmt(p.daily_limit), money(p.revenue_eur_per_view, 4), statePill(p.enabled), toggle(p, "save_shortlink"),
      ]), "Aucun réseau pour le moment."),
      addForm([
        ["name", "Nom du réseau"], ["api_url", "Adresse de l'API, avec {url} à la place du lien"], ["reward_tokens", `Récompense (${TK})`, "number", 15],
        ["daily_limit", "Passages par jour", "number", 1], ["revenue_eur_per_view", "Ce que te paie le réseau par vue (€)", "number", 0.003],
      ], "Ajouter le réseau", (item) => api("save_shortlink", { item }))),
    card("Offerwalls",
      table(["Code", "Nom", "Carte", "Statut d'annulation", "Adresse de retour à donner au réseau", "État", ""], data.offerwalls.map((o) => [
        o.code, o.name,
        saveButton(o.kind === "surveys" ? "Sondages ⇄" : "Offres ⇄", () => api("save_offerwall", { item: { code: o.code, kind: o.kind === "surveys" ? "offers" : "surveys" } }), "btn small ghost"),
        h("td", { class: "mono" }, o.reversed_status),
        h("td", { class: "mono wrap" }, `${postbackUrl}?wall=${o.code}&secret=${o.postback_secret}&user={USER}&tx={TX}&usd={MONTANT}&status={STATUT}`),
        statePill(o.enabled), toggle(o, "save_offerwall", "code"),
      ]), "Aucun offerwall pour le moment."),
      h("div", { class: "notice info", style: "margin-top:12px" }, "Dans l'adresse de retour, remplace {USER}, {TX}, {MONTANT} et {STATUT} par les variables du réseau : identifiant du membre, identifiant de la transaction, gain en dollars, statut. Une annulation est reconnue par le statut indiqué, ou par un montant négatif."),
      addForm([
        ["code", "Code (sans espace)"], ["name", "Nom"], ["kind", "Carte dans Gagner", WALL_KINDS, "offers"], ["iframe_url", "Adresse du mur, avec {user} à la place du membre"], ["postback_secret", "Secret choisi par toi"],
        ["reversed_status", "Valeur du statut quand le réseau annule une offre", "text", "reversed"],
      ], "Ajouter l'offerwall", (item) => api("save_offerwall", { item }))),
    card("Quêtes du jour",
      table(["Type", "Objectif", "Récompense", "État", ""], data.challenges.map((c) => [
        (GOALS.find(([g]) => g === c.goal) || GOALS[0])[1], fmt(c.target_claims), `${fmt(c.reward_tokens)} ${TK}`, statePill(c.enabled), toggle(c, "save_challenge"),
      ]), "Aucune quête."),
      addForm([["goal", "Type", GOALS, "claims"], ["target_claims", "Objectif à atteindre", "number", 10], ["reward_tokens", `Récompense (${TK})`, "number", 5]],
        "Ajouter le défi", (item) => api("save_challenge", { item }))));
}

// Simulateur ---------------------------------------------------------------
const SIM_GROUPS = [
  ["Audience", [["users_per_day", "Vrais membres actifs par jour"], ["bot_percent", "Part de robots (%)"], ["claims_per_user", "Réclamations par membre et par jour"]]],
  ["Faucet et pub", [["faucet_reward_tokens", `Récompense par réclamation (${TK})`], ["ads_per_claim", "Pubs vues par réclamation"], ["ecpm_eur", "Revenu pour 1 000 affichages (€)"], ["fill_percent", "Pubs réellement remplies (%)"], ["daily_bonus_tokens", `Bonus quotidien (${TK})`], ["wheel_tokens_per_user", `Roue du jour, gain moyen (${TK})`], ["games_tokens_per_user", `Mines et Dice par membre et par jour (${TK})`], ["challenge_tokens_per_user", `Défis par membre et par jour (${TK})`]]],
  ["PTC", [["ptc_per_user", "Vues par membre et par jour"], ["ptc_price_eur", "Prix payé par l'annonceur par vue (€)"], ["ptc_reward_tokens", `Récompense par vue (${TK})`]]],
  ["Liens raccourcis", [["links_per_user", "Liens par membre et par jour"], ["link_revenue_eur", "Revenu par lien (€)"], ["link_reward_tokens", `Récompense par lien (${TK})`]]],
  ["Offerwalls", [["offers_per_user_day", "Offres par membre et par jour"], ["offer_revenue_eur", "Revenu moyen par offre (€)"], ["offer_share_percent", "Part reversée (%)"]]],
  ["Autres", [["referral_share_percent", "Part des gains venant de filleuls (%)"], ["referral_percent", "Part du parrain (%)"], ["fixed_costs_eur", "Frais fixes par mois (€)"]]],
];

function loadSim() {
  try { return { ...BASE, ...JSON.parse(localStorage.getItem("cc.sim") || "{}") }; } catch { return { ...BASE }; }
}
let simInputs = loadSim();

function simulatorTab() {
  const out = h("div", { class: "stack" });
  const inputs = {};

  const results = () => {
    const mine = simulate(simInputs);
    const scen = Object.entries(SCENARIOS).map(([, s]) => [s.label, simulate({ ...simInputs, ...s })]);
    const verdict = mine.net >= 0
      ? h("div", { class: "notice good" }, `Ton scénario gagne ${money(mine.net)} par mois.`)
      : h("div", { class: "notice bad" }, `Ton scénario perd ${money(-mine.net)} par mois.`);
    const netCell = (v) => h("td", { class: "num", style: `font-weight:800;color:${v >= 0 ? "var(--good)" : "var(--bad)"}` }, money(v));

    out.replaceChildren(
      verdict,
      h("div", { class: "grid" },
        h("div", { class: "card stat" }, h("b", {}, money(mine.revenue)), "revenus par mois"),
        h("div", { class: "card stat" }, h("b", {}, money(mine.rewards + mine.referral)), "reversés aux membres"),
        h("div", { class: "card stat" }, h("b", {}, mine.payoutShare === null ? "—" : `${Math.round(mine.payoutShare * 100)} %`), "part reversée"),
        h("div", { class: "card stat" }, h("b", {}, `${mine.maxFaucetReward.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${TK}`), "récompense faucet maximale, payée par sa seule pub"),
        h("div", { class: "card stat" }, h("b", {}, mine.breakEvenEcpm === null ? "—" : money(mine.breakEvenEcpm)), "tarif de pub minimum pour 1 000 affichages"),
        h("div", { class: "card stat" }, h("b", {}, money(mine.perUserWeekEur, 4)), "versés par membre et par semaine")),
      card("Détail par source, sur 30 jours",
        h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", {}, "Source"), h("th", { class: "num" }, "Revenus"), h("th", { class: "num" }, "Reversé"), h("th", { class: "num" }, "Résultat"))),
          h("tbody", {},
            mine.sources.map((s) => h("tr", {}, h("td", {}, s.label), h("td", { class: "num" }, money(s.revenue)), h("td", { class: "num" }, money(s.cost)), netCell(s.net))),
            h("tr", {}, h("td", {}, "Parrainage"), h("td", { class: "num" }, money(0)), h("td", { class: "num" }, money(mine.referral)), netCell(-mine.referral)),
            h("tr", {}, h("td", {}, "Frais fixes"), h("td", { class: "num" }, money(0)), h("td", { class: "num" }, money(mine.fixed)), netCell(-mine.fixed)),
            h("tr", {}, h("td", {}, h("b", {}, "Total")), h("td", { class: "num" }, money(mine.revenue)), h("td", { class: "num" }, money(mine.rewards + mine.referral + mine.fixed)), netCell(mine.net)))))),
      card("Comparer avec d'autres hypothèses",
        h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", {}, "Scénario"), h("th", { class: "num" }, "Revenus"), h("th", { class: "num" }, "Reversé"), h("th", { class: "num" }, "Résultat"))),
          h("tbody", {}, scen.map(([label, r]) => h("tr", {}, h("td", {}, label), h("td", { class: "num" }, money(r.revenue)), h("td", { class: "num" }, money(r.rewards + r.referral)), netCell(r.net)))))),
        h("p", { class: "muted", style: "margin-top:8px" }, "Ces scénarios changent le tarif de pub, la part de robots et l'activité. Toutes les valeurs de départ sont des hypothèses, à remplacer par tes vrais chiffres.")));
  };

  const change = (key, value) => {
    simInputs = { ...simInputs, [key]: value };
    try { localStorage.setItem("cc.sim", JSON.stringify(simInputs)); } catch { /* navigation privee */ }
    results();
  };

  const form = h("div", { class: "stack" }, SIM_GROUPS.map(([title, fields]) =>
    card(title, h("div", { class: "grid" }, fields.map(([k, label]) => {
      inputs[k] = h("input", { type: "number", min: "0", step: "any", value: simInputs[k], oninput: (e) => change(k, Number(e.target.value) || 0) });
      return h("label", { class: "field" }, label, inputs[k]);
    })))));

  const fillReal = () => {
    const w = data.week;
    const s = data.settings;
    const active = Number(w.active_users) || 0;
    const days = 7;
    const next = {
      ...simInputs,
      tokens_per_eur: s.tokens_per_eur,
      faucet_reward_tokens: s.faucet_reward_tokens,
      daily_bonus_tokens: s.daily_bonus_tokens,
      wheel_tokens_per_user: Math.round((s.wheel_prizes || []).reduce((a, b) => a + b, 0) / Math.max((s.wheel_prizes || []).length, 1) * 10) / 10,
      referral_percent: Number(s.referral_percent),
      offer_share_percent: Number(s.offer_share_percent),
      users_per_day: active,
      claims_per_user: active ? Math.round((Number(w.claims) / active / days) * 10) / 10 : 0,
    };
    simInputs = next;
    for (const [k, el] of Object.entries(inputs)) el.value = next[k];
    try { localStorage.setItem("cc.sim", JSON.stringify(simInputs)); } catch { /* navigation privee */ }
    results();
  };

  results();
  return h("div", { class: "stack" },
    h("div", { class: "row between" },
      h("p", { class: "muted", style: "flex:1;min-width:240px" }, "Change une valeur : le résultat se recalcule tout de suite sur 30 jours."),
      h("button", { class: "btn ghost", type: "button", onclick: fillReal }, "Remplir avec mes 7 derniers jours"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { try { localStorage.removeItem("cc.sim"); } catch { /* navigation privee */ } simInputs = { ...BASE }; render(); } }, "Revenir aux hypothèses")),
    out, form);
}

// Structure ----------------------------------------------------------------
const TABS = [
  ["overview", "Vue d'ensemble", overviewTab],
  ["earnings", "À valider", earningsTab],
  ["withdrawals", "Retraits", withdrawalsTab],
  ["users", "Membres", usersTab],
  ["settings", "Réglages", settingsTab],
  ["content", "PTC, liens, offres", contentTab],
  ["simulator", "Simulateur", simulatorTab],
];

function loginPage() {
  const input = h("input", { type: "password", autocomplete: "current-password", required: true });
  return h("main", { class: "home" },
    h("section", { class: "hero" }, h("h1", {}, "Dashboard")),
    h("section", { class: "card auth" },
      h("form", {
        onsubmit: async (e) => {
          e.preventDefault();
          password = input.value;
          errorText = "";
          try {
            data = await api("overview");
            try { sessionStorage.setItem("cc.admin", password); } catch { /* navigation privee */ }
          } catch (err) {
            password = "";
            errorText = err.auth ? err.message : "Le serveur ne répond pas.";
          }
          render();
        },
      },
        h("label", { class: "field" }, "Mot de passe admin", input),
        h("button", { class: "btn big" }, "Se connecter")),
      errorText ? h("div", { class: "notice bad", role: "alert", style: "margin-top:12px" }, errorText) : null));
}

function render() {
  const root = document.getElementById("root");
  if (!data) { root.replaceChildren(loginPage()); return; }
  const s = data.settings;
  const review = Number(data.stats.earnings_to_review);
  const attention = Number(data.stats.attention);
  const badge = { earnings: review, withdrawals: attention, content: Number(data.stats.ads_to_review || 0) };
  const current = TABS.find(([k]) => k === tab) ?? TABS[0];
  root.replaceChildren(h("div", { class: "app" },
    h("nav", { class: "side", ariaLabel: "Menu" },
      h("span", { class: "logo" }, `${cfg.SITE_NAME} admin`),
      TABS.map(([k, label]) => h("a", {
        class: "nav", href: `#${k}`, "aria-current": k === tab ? "page" : undefined,
        onclick: (e) => { e.preventDefault(); tab = k; errorText = ""; render(); },
      }, label, badge[k] > 0 ? h("span", { class: "badge" }, fmt(badge[k])) : null)),
      h("div", { class: "spacer" }),
      h("a", { class: "nav", href: "index.html" }, "Voir le site")),
    h("main", { class: "main" },
      h("div", { class: "main-head" }, h("h1", {}, current[1]),
        h("button", { class: "btn ghost", type: "button", onclick: () => act(async () => {}) }, "Actualiser")),
      h("div", { class: `notice ${s.paused ? "bad" : "good"} row between`, style: "margin-bottom:14px" },
        h("span", {}, s.paused ? `Site en pause. ${s.pause_reason ?? ""}` : "Site ouvert : réclamations et retraits actifs."),
        saveButton(s.paused ? "Rouvrir le site" : "Mettre en pause",
          () => api("update_settings", { settings: s.paused ? { paused: false } : { paused: true, pause_reason: "Pause manuelle" } }),
          `btn small ${s.paused ? "" : "danger"}`)),
      errorText ? h("div", { class: "notice bad", role: "alert", style: "margin-bottom:14px" }, errorText) : null,
      current[2]())));
}

if (password) {
  api("overview").then((d) => { data = d; render(); }).catch(fail);
} else {
  render();
}
