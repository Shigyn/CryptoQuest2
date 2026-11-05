import { test } from "node:test";
import assert from "node:assert/strict";
import { createHarness } from "../dev/harness.mjs";
import { handleAdmin, handleApi, handleCron, handlePostback, normalizeAddress } from "../supabase/functions/_shared/core.ts";
import { BASE, SCENARIOS, simulate } from "../public/simulation.mjs";

let ipCounter = 0;
const freshIp = () => `10.${(++ipCounter >> 8) & 255}.${ipCounter & 255}.1`;

async function api(h, action, body = {}, ip = freshIp()) {
  const res = await handleApi(
    new Request("http://x/api", { method: "POST", headers: { "cf-connecting-ip": ip }, body: JSON.stringify({ action, captcha: "ok", ...body }) }),
    h.deps,
  );
  return { status: res.status, body: await res.json() };
}

const admin = async (h, body, password = h.deps.adminPassword) => {
  const res = await handleAdmin(
    new Request("http://x/admin", { method: "POST", headers: { "x-admin-password": password }, body: JSON.stringify(body) }),
    h.deps,
  );
  return { status: res.status, body: await res.json() };
};

let userCounter = 0;
async function newUser(h, { address, ip = freshIp(), ref } = {}) {
  const fp = address ?? `compte${++userCounter}@example.com`;
  const r = await api(h, "login", { address: fp, ref }, ip);
  assert.equal(r.body.ok, true, JSON.stringify(r.body));
  return { session: r.body.session, ip, fp };
}

const me = async (h, u) => (await api(h, "me", { session: u.session }, u.ip)).body;
const age = (h, seconds) => h.pg.query(`update claims set at = at - make_interval(secs => $1)`, [seconds]);
const cron = async (h, secret = h.deps.cronSecret) => {
  const res = await handleCron(new Request("http://x/cron", { headers: { authorization: `Bearer ${secret}` } }), h.deps);
  return { status: res.status, body: res.status === 200 ? await res.json() : null };
};

// Comptes --------------------------------------------------------------

test("entree avec la seule adresse FaucetPay : compte cree, puis retrouve", async () => {
  const h = await createHarness();
  const first = await api(h, "login", { address: "alice@x.com" });
  assert.equal(first.body.ok, true);
  assert.equal(first.body.created, true);
  const again = await api(h, "login", { address: " ALICE@x.com " });
  assert.equal(again.body.created, false);
  assert.equal((await h.pg.query("select count(*)::int n from users")).rows[0].n, 1);
  const u = { session: again.body.session, ip: freshIp() };
  assert.equal((await me(h, u)).fp_address, "alice@x.com");
  assert.equal((await me(h, u)).secured, false);
  await api(h, "logout", { session: u.session });
  assert.equal((await api(h, "me", { session: u.session })).status, 401);
  assert.equal((await api(h, "me", {})).status, 401);
});

test("une autre adresse du meme compte FaucetPay ouvre le meme compte", async () => {
  const h = await createHarness({ accounts: { "alice@x.com": "A", alice_pseudo: "A" } });
  await api(h, "login", { address: "alice@x.com" });
  const r = await api(h, "login", { address: "alice_pseudo" });
  assert.equal(r.body.created, false);
  assert.equal((await h.pg.query("select count(*)::int n from users")).rows[0].n, 1);
});

test("une adresse inconnue de FaucetPay est refusee, sans creer de compte", async () => {
  const h = await createHarness();
  assert.equal((await api(h, "login", { address: "inconnu@x.com" })).body.code, "invalid_address");
  assert.equal((await api(h, "login", { address: "<script>" })).body.code, "invalid_address");
  assert.equal((await h.pg.query("select count(*)::int n from users")).rows[0].n, 0);
});

test("un compte deja connu entre sans nouvel appel a FaucetPay", async () => {
  const h = await createHarness();
  await api(h, "login", { address: "alice@x.com" });
  await api(h, "login", { address: "alice@x.com" });
  assert.equal(h.mock.state.calls.filter((c) => c.path === "/check-address").length, 1);
});

test("pas de captcha a l'entree, mais exige a la reclamation, aux pubs et aux liens", async () => {
  const h = await createHarness();
  assert.equal((await api(h, "login", { address: "a@x.com", captcha: undefined })).body.ok, true);
  await admin(h, { action: "save_shortlink", item: { name: "Lien", api_url: "https://x/api?url={url}", reward_tokens: 15, daily_limit: 1 } });
  const id = (await admin(h, { action: "overview" })).body.shortlinks[0].id;
  const v = await newUser(h);
  assert.equal((await api(h, "shortlink_start", { session: v.session, id, captcha: "mauvais" }, v.ip)).body.code, "captcha");
  await admin(h, { action: "save_ptc", item: { title: "Pub", url: "https://e.com", reward_tokens: 10, duration_seconds: 5, max_views: 2 } });
  const pid = (await admin(h, { action: "overview" })).body.ptc[0].id;
  await api(h, "ptc_start", { session: v.session, id: pid }, v.ip);
  await h.pg.query("update ptc_views set started_at = now() - interval '6 seconds'");
  assert.equal((await api(h, "ptc_complete", { session: v.session, id: pid, captcha: "mauvais" }, v.ip)).body.code, "captcha");
  const u = await newUser(h);
  assert.equal((await api(h, "claim", { session: u.session, captcha: "mauvais" }, u.ip)).body.code, "captcha");
  assert.equal((await me(h, u)).available, 0);
});

test("trop de comptes crees depuis une IP sont refuses", async () => {
  const h = await createHarness();
  const ip = freshIp();
  for (let i = 0; i < 3; i++) assert.equal((await api(h, "login", { address: `s${i}@x.com` }, ip)).body.ok, true);
  assert.equal((await api(h, "login", { address: "s9@x.com" }, ip)).body.code, "too_many_signups");
  assert.equal((await api(h, "login", { address: "s0@x.com" }, ip)).body.ok, true, "un compte existant entre toujours");
});

test("mot de passe facultatif : une fois choisi, l'adresse seule ne suffit plus", async () => {
  const h = await createHarness();
  const u = await newUser(h, { address: "alice@x.com" });
  const other = (await api(h, "login", { address: "alice@x.com" })).body.session;
  assert.equal((await api(h, "set_password", { session: u.session, password: "court" }, u.ip)).body.code, "weak_password");
  const set = await api(h, "set_password", { session: u.session, password: "mon mot de passe" }, u.ip);
  assert.equal(set.body.ok, true);
  assert.equal((await api(h, "me", { session: other })).status, 401, "les autres sessions tombent");
  assert.equal((await me(h, { session: set.body.session, ip: u.ip })).secured, true);
  assert.equal((await api(h, "login", { address: "alice@x.com" })).body.code, "password_required");
  assert.equal((await api(h, "login", { address: "alice@x.com", password: "faux" })).body.code, "bad_password");
  assert.equal((await api(h, "login", { address: "alice@x.com", password: "mon mot de passe" })).body.ok, true);
  for (let i = 0; i < 5; i++) await api(h, "login", { address: "alice@x.com", password: "faux" });
  assert.equal((await api(h, "login", { address: "alice@x.com", password: "mon mot de passe" })).body.code, "locked", "verrou apres 5 erreurs");
  await h.pg.query("update users set locked_until = now() - interval '1 second'");
  assert.equal((await api(h, "login", { address: "alice@x.com", password: "mon mot de passe" })).body.ok, true, "le verrou expire");
  const { rows } = await h.pg.query("select password_hash from users");
  assert.ok(!rows[0].password_hash.includes("mon mot de passe"));
  assert.match(rows[0].password_hash, /^100000:/);
});

test("un compte banni ne peut plus entrer", async () => {
  const h = await createHarness();
  const u = await newUser(h, { address: "alice@x.com" });
  const [row] = (await admin(h, { action: "users", search: "alice" })).body.users;
  await admin(h, { action: "ban_user", id: row.id, banned: true, reason: "test" });
  assert.equal((await api(h, "me", { session: u.session }, u.ip)).status, 401);
  assert.equal((await api(h, "login", { address: "alice@x.com" })).body.code, "banned");
});

// Faucet ---------------------------------------------------------------

test("une reclamation credite les tokens tout de suite, sans toucher a FaucetPay", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  const r = await api(h, "claim", { session: u.session }, u.ip);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.tokens, 2);
  assert.equal((await me(h, u)).available, 2);
  assert.equal(h.mock.state.payouts.length, 0);
});

test("le delai bloque le compte et l'IP, puis se libere", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  await api(h, "claim", { session: u.session }, u.ip);
  const again = await api(h, "claim", { session: u.session }, freshIp());
  assert.equal(again.body.code, "cooldown");
  assert.ok(again.body.retry_after > 0 && again.body.retry_after <= 300);
  const other = await newUser(h);
  assert.equal((await api(h, "claim", { session: other.session }, u.ip)).body.code, "cooldown");
  assert.ok((await me(h, u)).retry_after > 0);
  await age(h, 301);
  assert.equal((await api(h, "claim", { session: u.session }, u.ip)).body.ok, true);
  assert.equal((await me(h, u)).available, 4);
});

test("les plafonds quotidiens et le coupe-circuit bloquent", async () => {
  const h = await createHarness();
  await admin(h, { action: "update_settings", settings: { max_claims_account_day: 1 } });
  const u = await newUser(h);
  await api(h, "claim", { session: u.session }, u.ip);
  await age(h, 301);
  assert.equal((await api(h, "claim", { session: u.session }, u.ip)).body.code, "daily_limit");

  const h2 = await createHarness();
  await admin(h2, { action: "update_settings", settings: { max_claims_site_hour: 1 } });
  const a = await newUser(h2);
  const b = await newUser(h2);
  await api(h2, "claim", { session: a.session }, a.ip);
  assert.equal((await api(h2, "claim", { session: b.session }, b.ip)).body.code, "paused");
  assert.match(h2.alerts[0], /plafond horaire/);
  assert.equal((await api(h2, "claim", { session: a.session }, a.ip)).body.code, "paused");
});

test("bonus quotidien et defis : une fois par jour, seulement si l'objectif est atteint", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  assert.equal((await api(h, "daily", { session: u.session }, u.ip)).body.code, "not_reached");
  await api(h, "claim", { session: u.session }, u.ip);
  assert.equal((await api(h, "daily", { session: u.session }, u.ip)).body.tokens, 5);
  assert.equal((await api(h, "daily", { session: u.session }, u.ip)).body.code, "already_done");

  const m = await me(h, u);
  assert.equal(m.available, 7);
  const first = m.challenges[0];
  assert.equal(first.target, 5);
  assert.equal((await api(h, "challenge", { session: u.session, id: first.id }, u.ip)).body.code, "not_reached");
  for (let i = 0; i < 4; i++) {
    await age(h, 301);
    await api(h, "claim", { session: u.session }, u.ip);
  }
  // Toujours le meme jour UTC : on replace les reclamations a maintenant pour le test.
  await h.pg.query("update claims set at = now()");
  assert.equal((await api(h, "challenge", { session: u.session, id: first.id }, u.ip)).body.tokens, 2);
  assert.equal((await api(h, "challenge", { session: u.session, id: first.id }, u.ip)).body.code, "already_done");
});

test("roue du jour : gratuite, une fois par jour, apres une reclamation, gain tire dans la liste", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  assert.equal((await api(h, "wheel", { session: u.session }, u.ip)).body.code, "not_reached");
  await api(h, "claim", { session: u.session }, u.ip);
  const r = await api(h, "wheel", { session: u.session }, u.ip);
  assert.equal(r.body.ok, true);
  const m = await me(h, u);
  assert.equal(m.wheel_prizes[r.body.index], r.body.tokens);
  assert.equal(m.available, 2 + r.body.tokens);
  assert.equal(m.wheel_done, true);
  assert.equal((await api(h, "wheel", { session: u.session }, u.ip)).body.code, "already_done");
});

test("roue du jour : les cases se reglent dans le dashboard", async () => {
  const h = await createHarness();
  await admin(h, { action: "update_settings", settings: { wheel_prizes: [7, 7], wheel_min_claims: 0 } });
  const u = await newUser(h);
  assert.equal((await api(h, "wheel", { session: u.session }, u.ip)).body.tokens, 7);
});

test("le parrain gagne sa part sans perdre les fractions, pas depuis sa propre IP", async () => {
  const h = await createHarness();
  const parrain = await newUser(h);
  const ref = (await me(h, parrain)).ref_code;
  const filleul = await newUser(h, { ref });
  for (let i = 0; i < 5; i++) {
    await api(h, "claim", { session: filleul.session }, filleul.ip);
    await age(h, 301);
  }
  // 10 % de 5 x 2 tokens = 1 token entier
  const m = await me(h, parrain);
  assert.equal(m.available, 1);
  assert.equal(m.referrals, 1);

  const memeIp = await newUser(h, { ref, ip: parrain.ip });
  assert.ok(memeIp);
  assert.equal((await me(h, parrain)).referrals, 1);
});

// Retrait immediat -----------------------------------------------------

test("le retrait convertit au bon taux, sans minimum, et paie tout de suite", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  await api(h, "claim", { session: u.session }, u.ip);
  const r = await api(h, "withdraw", { session: u.session }, u.ip);
  assert.equal(r.body.ok, true, JSON.stringify(r.body));
  // 2 tokens / 10 000 x 1,10 USDT par euro = 0,00022 USDT = 22 000 unites
  assert.equal(r.body.amount_units, 22000);
  assert.equal(h.mock.state.payouts[0].amount, 22000);
  assert.equal(h.mock.state.payouts[0].currency, "USDT");
  assert.ok(h.mock.state.payouts[0].ip_address);
  assert.equal((await me(h, u)).available, 0);
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.code, "nothing_to_withdraw");
});

test("10 000 tokens valent 1 euro", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  await h.pg.query("update users set available = 10000");
  await h.pg.query("update coins set per_eur = 1 where code = 'USDT'");
  const r = await api(h, "withdraw", { session: u.session }, u.ip);
  assert.equal(r.body.amount_units, 100000000);
});

test("un retrait refuse rend les tokens", async () => {
  const h = await createHarness();
  const u = await newUser(h, { address: "refuse@x.com" });
  await api(h, "claim", { session: u.session }, u.ip);
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.code, "invalid_address");
  assert.equal((await me(h, u)).available, 2);
});

test("une reponse perdue est relancee sans payer deux fois", async () => {
  const h = await createHarness();
  const u = await newUser(h, { address: "panne@x.com" });
  await api(h, "claim", { session: u.session }, u.ip);
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.ok, true);
  assert.equal(h.mock.state.payouts.length, 1);
  const sends = h.mock.state.calls.filter((c) => c.path === "/send");
  assert.equal(sends.length, 2);
  assert.equal(sends[0].body.idempotency_key, sends[1].body.idempotency_key);
});

test("sans reponse, les tokens restent bloques et la relance admin ne paie qu'une fois", async () => {
  const h = await createHarness();
  const u = await newUser(h, { address: "panne-totale@x.com" });
  await api(h, "claim", { session: u.session }, u.ip);
  const r = await api(h, "withdraw", { session: u.session }, u.ip);
  assert.equal(r.status, 202);
  assert.equal((await me(h, u)).available, 0);
  const [w] = (await admin(h, { action: "withdrawals", filter: "attention" })).body.withdrawals;
  assert.equal(w.status, "unknown");
  assert.equal((await admin(h, { action: "retry", id: w.id })).body.code, "too_soon");
  await h.pg.query("update withdrawals set created_at = now() - interval '2 minutes', to_address = 'ok@x.com'");
  assert.equal((await admin(h, { action: "retry", id: w.id })).body.ok, true);
  assert.equal(h.mock.state.payouts.length, 1);
  assert.equal((await admin(h, { action: "retry", id: w.id })).body.code, "not_retryable");
});

test("solde vide : refuse, tokens rendus, alerte, reprise apres recharge", async () => {
  const h = await createHarness({ balance: 10 });
  const u = await newUser(h);
  await api(h, "claim", { session: u.session }, u.ip);
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.code, "coin_empty");
  assert.equal((await me(h, u)).available, 2);
  assert.match(h.alerts[0], /vide/);
  const before = h.mock.state.calls.length;
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.code, "coin_empty");
  assert.equal(h.mock.state.calls.length, before, "pas d'appel inutile");
  h.mock.state.balance = 1_000_000_000;
  await h.pg.query("update coins set last_balance_at = now() - interval '6 minutes'");
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.ok, true);
});

test("le plafond de paiement en euros met le site en pause", async () => {
  const h = await createHarness();
  await admin(h, { action: "update_settings", settings: { max_payout_eur_day: 1 } });
  const u = await newUser(h);
  await h.pg.query("update users set available = 10001");
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.code, "paused");
  assert.equal(h.mock.state.payouts.length, 0);
  assert.match(h.alerts[0], /plafond de paiement/);
  assert.equal((await me(h, u)).available, 10001);
});

test("le plafond de la cle FaucetPay met en pause et rend les tokens", async () => {
  const h = await createHarness();
  h.mock.state.keyCapReached = true;
  const u = await newUser(h);
  await api(h, "claim", { session: u.session }, u.ip);
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.code, "paused");
  assert.equal((await me(h, u)).available, 2);
  await age(h, 301);
  assert.equal((await api(h, "claim", { session: u.session }, u.ip)).body.code, "paused");
});

test("une crypto sans taux ou desactivee est refusee", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  assert.equal((await api(h, "set_coin", { session: u.session, coin: "BTC" }, u.ip)).body.code, "coin_unavailable");
  await admin(h, { action: "update_coin", code: "DOGE", coin: { enabled: true, per_eur: 5 } });
  assert.equal((await api(h, "set_coin", { session: u.session, coin: "DOGE" }, u.ip)).body.ok, true);
  await h.pg.query("update users set available = 10000");
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.amount_units, 500000000);
});

// PTC, liens, offres, validation et lot horaire ---------------------------

async function withPtc(h) {
  await admin(h, { action: "save_ptc", item: { title: "Pub", url: "https://exemple.com", reward_tokens: 10, duration_seconds: 5, max_views: 2 } });
  return (await admin(h, { action: "overview" })).body.ptc[0].id;
}

test("PTC : minuteur serveur, une fois par jour, plafond de vues", async () => {
  const h = await createHarness();
  const id = await withPtc(h);
  const u = await newUser(h);
  assert.equal((await api(h, "ptc_complete", { session: u.session, id }, u.ip)).body.code, "not_found");
  const start = await api(h, "ptc_start", { session: u.session, id }, u.ip);
  assert.equal(start.body.url, "https://exemple.com");
  assert.equal((await api(h, "ptc_complete", { session: u.session, id }, u.ip)).body.code, "too_soon");
  await h.pg.query("update ptc_views set started_at = now() - interval '6 seconds'");
  assert.equal((await api(h, "ptc_complete", { session: u.session, id }, u.ip)).body.tokens, 10);
  const m = await me(h, u);
  assert.equal(m.pending, 10);
  assert.equal(m.available, 0);
  assert.equal((await api(h, "ptc_complete", { session: u.session, id }, u.ip)).body.code, "already_done");
  assert.equal((await api(h, "ptc_start", { session: u.session, id }, u.ip)).body.code, "already_done");

  const v = await newUser(h);
  await api(h, "ptc_start", { session: v.session, id }, v.ip);
  await h.pg.query("update ptc_views set started_at = now() - interval '6 seconds'");
  await api(h, "ptc_complete", { session: v.session, id }, v.ip);
  const w = await newUser(h);
  assert.equal((await api(h, "ptc_start", { session: w.session, id }, w.ip)).body.code, "not_found", "plafond atteint");
});

test("lien raccourci : pas de retour immediat, pas de double gain, limite quotidienne", async () => {
  const h = await createHarness();
  await admin(h, { action: "save_shortlink", item: { name: "Lien", api_url: "https://x/api?url={url}", reward_tokens: 15, daily_limit: 1 } });
  const id = (await admin(h, { action: "overview" })).body.shortlinks[0].id;
  const u = await newUser(h);
  const s = await api(h, "shortlink_start", { session: u.session, id }, u.ip);
  assert.ok(s.body.url);
  const token = new URL(decodeURIComponent(s.body.url.split("to=")[1])).searchParams.get("sl");
  assert.equal((await api(h, "shortlink_complete", { session: u.session, token }, u.ip)).body.code, "too_soon");
  await h.pg.query("update shortlink_visits set created_at = now() - interval '11 seconds'");
  const other = await newUser(h);
  assert.equal((await api(h, "shortlink_complete", { session: other.session, token }, other.ip)).body.code, "not_found");
  assert.equal((await api(h, "shortlink_complete", { session: u.session, token }, u.ip)).body.tokens, 15);
  assert.equal((await api(h, "shortlink_complete", { session: u.session, token }, u.ip)).body.code, "already_done");
  assert.equal((await me(h, u)).pending, 15);
  assert.equal((await api(h, "shortlink_start", { session: u.session, id }, u.ip)).body.code, "daily_limit");
});

const postback = async (h, params) => {
  const res = await handlePostback(new Request("http://x/postback?" + new URLSearchParams(params)), h.deps);
  return { status: res.status, text: await res.text() };
};

test("offerwall : secret exige, partage du revenu, pas de double credit, annulation", async () => {
  const h = await createHarness();
  await admin(h, { action: "save_offerwall", item: { code: "mur", name: "Mur", iframe_url: "https://x/{user}", postback_secret: "secret-du-mur" } });
  const u = await newUser(h);
  const user = (await me(h, u)).ref_code;
  const good = { wall: "mur", secret: "secret-du-mur", user, tx: "T1", usd: "1.10" };
  assert.equal((await postback(h, { ...good, secret: "faux" })).status, 403);
  assert.equal((await postback(h, good)).status, 200);
  // 1,10 USD = 1 EUR au taux de 1,10 ; 1 EUR = 10 000 tokens ; part de 50 % = 5 000
  assert.equal((await me(h, u)).pending, 5000);
  await postback(h, good);
  assert.equal((await me(h, u)).pending, 5000, "pas de double credit");
  await postback(h, { ...good, status: "reversed" });
  assert.equal((await me(h, u)).pending, 0);
  await postback(h, { ...good, status: "reversed" });
  assert.equal((await me(h, u)).pending, 0);
});

test("offerwall : statut d'annulation propre au reseau, ou montant negatif", async () => {
  const h = await createHarness();
  await admin(h, { action: "save_offerwall", item: { code: "cpx", name: "CPX", iframe_url: "https://x/{user}", postback_secret: "s", reversed_status: "2" } });
  const u = await newUser(h);
  const user = (await me(h, u)).ref_code;
  await postback(h, { wall: "cpx", secret: "s", user, tx: "A", usd: "0.11", status: "1" });
  assert.equal((await me(h, u)).pending, 500);
  await postback(h, { wall: "cpx", secret: "s", user, tx: "A", usd: "0.11", status: "2" });
  assert.equal((await me(h, u)).pending, 0);
  await postback(h, { wall: "cpx", secret: "s", user, tx: "B", usd: "0.11" });
  await postback(h, { wall: "cpx", secret: "s", user, tx: "B", usd: "-0.11" });
  assert.equal((await me(h, u)).pending, 0);
});

test("validation puis lot horaire : tout part en un seul paiement, a un seul moment", async () => {
  const h = await createHarness();
  await admin(h, { action: "save_offerwall", item: { code: "mur", name: "Mur", iframe_url: "https://x/{user}", postback_secret: "s" } });
  const u = await newUser(h);
  const user = (await me(h, u)).ref_code;
  await postback(h, { wall: "mur", secret: "s", user, tx: "T1", usd: "0.11" });
  await postback(h, { wall: "mur", secret: "s", user, tx: "T2", usd: "0.11" });

  // Rien ne part tant que ce n'est pas valide
  assert.equal((await cron(h)).body.paid, 0);
  assert.equal(h.mock.state.payouts.length, 0);

  const list = (await admin(h, { action: "earnings", status: "pending" })).body.earnings;
  assert.equal(list.length, 2);
  await admin(h, { action: "validate", ids: [list[0].id] });
  let m = await me(h, u);
  assert.equal(m.pending, 500);
  assert.equal(m.validated, 500);
  await admin(h, { action: "validate", all_clean: true });
  m = await me(h, u);
  assert.equal(m.validated, 1000);

  assert.equal((await cron(h)).body.paid, 1);
  assert.equal(h.mock.state.payouts.length, 1);
  m = await me(h, u);
  assert.equal(m.validated, 0);
  assert.equal((await admin(h, { action: "earnings", status: "paid" })).body.earnings.length, 2);
  assert.equal((await cron(h)).body.paid, 0, "pas de second paiement");
  assert.equal(h.mock.state.payouts.length, 1);
});

test("offre annulee apres paiement : le compte passe en negatif", async () => {
  const h = await createHarness();
  await admin(h, { action: "save_offerwall", item: { code: "mur", name: "Mur", iframe_url: "https://x/{user}", postback_secret: "s" } });
  const u = await newUser(h);
  const user = (await me(h, u)).ref_code;
  await postback(h, { wall: "mur", secret: "s", user, tx: "T1", usd: "0.11" });
  await admin(h, { action: "validate", all_clean: true });
  await cron(h);
  await postback(h, { wall: "mur", secret: "s", user, tx: "T1", status: "reversed" });
  assert.equal((await me(h, u)).available, -500);
  assert.equal((await api(h, "withdraw", { session: u.session }, u.ip)).body.code, "nothing_to_withdraw");
});

test("une IP partagee est signalee et echappe a « tout valider »", async () => {
  const h = await createHarness();
  await admin(h, { action: "save_offerwall", item: { code: "mur", name: "Mur", iframe_url: "https://x/{user}", postback_secret: "s" } });
  const ip = freshIp();
  const a = await newUser(h, { ip });
  await newUser(h, { ip });
  await postback(h, { wall: "mur", secret: "s", user: (await me(h, a)).ref_code, tx: "T1", usd: "0.11" });
  const [e] = (await admin(h, { action: "earnings", status: "pending" })).body.earnings;
  assert.match(e.risk, /IP partagée/);
  assert.equal((await admin(h, { action: "validate", all_clean: true })).body.count, 0);
  assert.equal((await admin(h, { action: "validate", ids: [e.id] })).body.count, 1);
});

test("un gain rejete disparait sans etre paye", async () => {
  const h = await createHarness();
  await admin(h, { action: "save_offerwall", item: { code: "mur", name: "Mur", iframe_url: "https://x/{user}", postback_secret: "s" } });
  const u = await newUser(h);
  await postback(h, { wall: "mur", secret: "s", user: (await me(h, u)).ref_code, tx: "T1", usd: "0.11" });
  const [e] = (await admin(h, { action: "earnings", status: "pending" })).body.earnings;
  await admin(h, { action: "reject", ids: [e.id] });
  assert.equal((await me(h, u)).pending, 0);
  await cron(h);
  assert.equal(h.mock.state.payouts.length, 0);
});

test("lot horaire : echec rendu, arret sur solde vide, secret exige", async () => {
  const h = await createHarness();
  assert.equal((await cron(h, "faux-secret-de-test-long")).status, 403);
  const a = await newUser(h, { address: "refuse@x.com" });
  await h.pg.query("update users set validated = 100");
  assert.equal((await cron(h)).body.failed, 1);
  assert.equal((await me(h, a)).validated, 100);
});

test("bannir une IP bloque, lever le bannissement rouvre", async () => {
  const h = await createHarness();
  const u = await newUser(h);
  const [row] = (await admin(h, { action: "users", search: u.fp })).body.users;
  await admin(h, { action: "ban", kind: "ip", value: row.last_ip_hash });
  assert.equal((await api(h, "claim", { session: u.session }, u.ip)).body.code, "banned");
  await admin(h, { action: "unban", kind: "ip", value: row.last_ip_hash });
  assert.equal((await api(h, "claim", { session: u.session }, u.ip)).body.ok, true);
});

// Securite -------------------------------------------------------------

test("l'admin refuse sans bon mot de passe, et lit les soldes en direct", async () => {
  const h = await createHarness({ balance: 777 });
  assert.equal((await admin(h, { action: "overview" }, "faux")).status, 401);
  const r = await admin(h, { action: "overview" });
  assert.equal(r.body.balance_error, null);
  assert.equal(r.body.coins.find((c) => c.code === "USDT").last_balance_units, 777);
  h.deps.adminPassword = "court";
  assert.equal((await admin(h, { action: "overview" }, "court")).body.code, "admin_not_configured");
});

test("le statut public ne montre ni adresse entiere, ni e-mail, ni IP", async () => {
  const h = await createHarness();
  const u = await newUser(h, { address: "alice@example.com" });
  await api(h, "claim", { session: u.session }, u.ip);
  await api(h, "withdraw", { session: u.session }, u.ip);
  const res = await handleApi(
    new Request("http://x/api", { method: "POST", headers: { "cf-connecting-ip": "1.1.1.1" }, body: JSON.stringify({ action: "status" }) }),
    h.deps,
  );
  const text = await res.text();
  assert.equal(JSON.parse(text).recent[0].who, "ali…com");
  assert.ok(!text.includes("alice@example.com"));
  
});

test("l'IP n'est jamais stockee en clair", async () => {
  const h = await createHarness();
  const u = await newUser(h, { ip: "8.8.8.8" });
  await api(h, "claim", { session: u.session }, u.ip);
  const dump = JSON.stringify([(await h.pg.query("select * from users")).rows, (await h.pg.query("select * from claims")).rows]);
  assert.ok(!dump.includes("8.8.8.8"));
});

test("un visiteur sans droit ne peut ni lire les tables ni appeler les fonctions", async () => {
  const h = await createHarness();
  for (const role of ["anon", "authenticated"]) {
    await h.pg.exec(`set role ${role}`);
    for (const sql of [
      "select * from users", "select * from ledger", "select * from offerwalls", "select admin_overview()",
      "select public.pause_faucet('x')", "select public.move_tokens(gen_random_uuid(),'available',1,'x',null)",
    ]) {
      await assert.rejects(h.pg.query(sql), /permission denied/, `${role}: ${sql}`);
    }
    await h.pg.exec("reset role");
  }
});

test("la migration se rejoue sans erreur", async () => {
  const { readFileSync } = await import("node:fs");
  const h = await createHarness();
  await newUser(h);
  await h.pg.exec(readFileSync(new URL("../supabase/migrations/20261106000000_cryptocoin.sql", import.meta.url), "utf8"));
  assert.equal((await h.pg.query("select count(*)::int n from users")).rows[0].n, 0);
});

test("normalisation des adresses", () => {
  assert.equal(normalizeAddress(" A+b@X.com "), "a@x.com");
  assert.equal(normalizeAddress("DGabc+1"), "dgabc+1");
});

// Simulateur -----------------------------------------------------------

test("simulation : faucet seul, calcul a la main", () => {
  const r = simulate({
    ...BASE, users_per_day: 100, bot_percent: 0, claims_per_user: 10, faucet_reward_tokens: 2, ads_per_claim: 3,
    ecpm_eur: 1, fill_percent: 100, daily_bonus_tokens: 0, wheel_tokens_per_user: 0, challenge_tokens_per_user: 0, ptc_per_user: 0,
    links_per_user: 0, offers_per_user_day: 0, referral_share_percent: 0, fixed_costs_eur: 0,
  });
  // 30 000 reclamations x 3 pubs = 90 000 affichages = 90 EUR ; 30 000 x 2 tokens = 60 000 tokens = 6 EUR
  assert.equal(r.revenue, 90);
  assert.equal(r.rewards, 6);
  assert.equal(r.net, 84);
  assert.equal(r.maxFaucetReward, 30);
  assert.equal(r.claimsPerDay, 1000);
});

test("simulation : les robots coutent sans rapporter", () => {
  const off = { daily_bonus_tokens: 0, wheel_tokens_per_user: 0, challenge_tokens_per_user: 0, ptc_per_user: 0, links_per_user: 0, offers_per_user_day: 0, referral_share_percent: 0, fixed_costs_eur: 0 };
  const clean = simulate({ ...BASE, ...off, bot_percent: 0 });
  const bots = simulate({ ...BASE, ...off, bot_percent: 50 });
  assert.equal(bots.revenue, clean.revenue);
  assert.equal(bots.rewards, clean.rewards * 2);
});

test("simulation : le tarif d'equilibre annule le resultat", () => {
  const losing = { ...BASE, ptc_per_user: 0, links_per_user: 0, offers_per_user_day: 0, fixed_costs_eur: 20 };
  const r = simulate(losing);
  assert.ok(r.breakEvenEcpm > 0);
  const again = simulate({ ...losing, ecpm_eur: r.breakEvenEcpm });
  assert.ok(Math.abs(again.net) < 1e-9, String(again.net));
});

test("simulation : les trois scenarios tournent et sont ordonnes", () => {
  const net = Object.values(SCENARIOS).map((s) => simulate({ ...BASE, ...s }).net);
  assert.ok(net.every(Number.isFinite));
  assert.ok(net[0] < net[1] && net[1] < net[2], net.join());
});
