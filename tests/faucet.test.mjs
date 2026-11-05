import { test } from "node:test";
import assert from "node:assert/strict";
import { createHarness } from "../dev/harness.mjs";
import { handleAdmin, handleClaim, handleStatus, normalizeAddress } from "../supabase/functions/_shared/core.ts";

let ipCounter = 0;
const freshIp = () => `10.0.0.${++ipCounter}`;

async function claim(h, address, { ip = freshIp(), coin = "DOGE", captcha = "ok" } = {}) {
  const res = await handleClaim(
    new Request("http://x/claim", {
      method: "POST",
      headers: { "cf-connecting-ip": ip },
      body: JSON.stringify({ coin, address, captcha }),
    }),
    h.deps,
  );
  return { status: res.status, body: await res.json() };
}

const admin = async (h, body, password = h.deps.adminPassword) => {
  const res = await handleAdmin(
    new Request("http://x/admin", {
      method: "POST",
      headers: { "x-admin-password": password },
      body: JSON.stringify(body),
    }),
    h.deps,
  );
  return { status: res.status, body: await res.json() };
};

// Fait croire que la reclamation est plus ancienne, sans attendre.
const age = (h, seconds) =>
  h.pg.query(`update claims set created_at = created_at - make_interval(secs => $1)`, [seconds]);

test("une reclamation valide paie tout de suite le bon montant", async () => {
  const h = await createHarness();
  const r = await claim(h, "alice@example.com");
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.amount_units, 200000);
  assert.equal(r.body.payout_id, "1001");
  assert.equal(h.mock.state.payouts.length, 1);
  assert.equal(h.mock.state.payouts[0].amount, 200000);
  assert.equal(h.mock.state.payouts[0].currency, "DOGE");
  assert.ok(h.mock.state.payouts[0].ip_address, "l'IP part vers FaucetPay");
});

test("le captcha refuse sans rien payer", async () => {
  const h = await createHarness();
  const r = await claim(h, "alice@example.com", { captcha: "mauvais" });
  assert.equal(r.body.code, "captcha");
  assert.equal(h.mock.state.payouts.length, 0);
});

test("le delai bloque la meme adresse, et ses variantes", async () => {
  const h = await createHarness();
  await claim(h, "alice@example.com");
  for (const variant of ["alice@example.com", "ALICE@example.com", "alice+2@example.com"]) {
    const r = await claim(h, variant);
    assert.equal(r.status, 429, variant);
    assert.equal(r.body.code, "cooldown");
    assert.ok(r.body.retry_after > 0 && r.body.retry_after <= 300);
  }
  assert.equal(h.mock.state.payouts.length, 1);
});

test("le delai bloque une autre adresse depuis la meme IP", async () => {
  const h = await createHarness();
  await claim(h, "alice@example.com", { ip: "1.1.1.1" });
  const r = await claim(h, "bob@example.com", { ip: "1.1.1.1" });
  assert.equal(r.body.code, "cooldown");
  assert.equal(h.mock.state.payouts.length, 1);
});

test("le delai bloque un meme compte FaucetPay sous un autre identifiant", async () => {
  const h = await createHarness({ accounts: { "alice@example.com": "COMPTE", "alice_pseudo": "COMPTE" } });
  await claim(h, "alice@example.com");
  const r = await claim(h, "alice_pseudo");
  assert.equal(r.body.code, "cooldown");
  assert.equal(h.mock.state.payouts.length, 1);
});

test("le delai est libre apres son expiration", async () => {
  const h = await createHarness();
  await claim(h, "alice@example.com", { ip: "2.2.2.2" });
  await age(h, 301);
  const r = await claim(h, "alice@example.com", { ip: "2.2.2.2" });
  assert.equal(r.body.ok, true);
  assert.equal(h.mock.state.payouts.length, 2);
});

test("une adresse deja payee ne coute plus d'appel de verification", async () => {
  const h = await createHarness();
  await claim(h, "alice@example.com");
  await age(h, 301);
  await claim(h, "alice@example.com");
  assert.equal(h.mock.state.calls.filter((c) => c.path === "/check-address").length, 1);
});

test("une adresse inconnue est refusee et ne consomme pas le delai de l'IP", async () => {
  const h = await createHarness();
  const r = await claim(h, "inconnu@example.com", { ip: "3.3.3.3" });
  assert.equal(r.body.code, "invalid_address");
  const ok = await claim(h, "alice@example.com", { ip: "3.3.3.3" });
  assert.equal(ok.body.ok, true);
});

test("un destinataire refuse a l'envoi ne consomme pas le delai", async () => {
  const h = await createHarness();
  const r = await claim(h, "refuse@example.com", { ip: "3.3.3.4" });
  assert.equal(r.body.code, "invalid_address");
  assert.equal(h.mock.state.payouts.length, 0);
  assert.equal((await claim(h, "alice@example.com", { ip: "3.3.3.4" })).body.ok, true);
});

test("une reponse perdue est relancee sans payer deux fois", async () => {
  const h = await createHarness();
  const r = await claim(h, "panne@example.com");
  assert.equal(r.body.ok, true);
  assert.equal(h.mock.state.payouts.length, 1, "un seul paiement");
  const sends = h.mock.state.calls.filter((c) => c.path === "/send");
  assert.equal(sends.length, 2);
  assert.equal(sends[0].body.idempotency_key, sends[1].body.idempotency_key);
});

test("sans reponse de FaucetPay, la reclamation attend et garde le delai", async () => {
  const h = await createHarness();
  const r = await claim(h, "panne-totale@example.com", { ip: "4.4.4.4" });
  assert.equal(r.status, 202);
  assert.equal(r.body.code, "pending");
  const again = await claim(h, "panne-totale@example.com", { ip: "4.4.4.4" });
  assert.equal(again.body.code, "cooldown");
  const list = await admin(h, { action: "claims", filter: "attention" });
  assert.equal(list.body.claims.length, 1);
  assert.equal(list.body.claims[0].status, "unknown");
});

test("le plafond horaire met le faucet en pause et alerte", async () => {
  const h = await createHarness();
  await admin(h, { action: "update_settings", settings: { max_claims_site_hour: 2 } });
  assert.equal((await claim(h, "a1@example.com")).body.ok, true);
  assert.equal((await claim(h, "a2@example.com")).body.ok, true);
  const third = await claim(h, "a3@example.com");
  assert.equal(third.body.code, "paused");
  assert.equal(h.mock.state.payouts.length, 2);
  assert.match(h.alerts[0], /plafond horaire/);
  assert.equal((await claim(h, "a4@example.com")).body.code, "paused");
});

test("les plafonds par jour bloquent", async () => {
  const h = await createHarness();
  await admin(h, { action: "update_settings", settings: { max_claims_account_day: 1 } });
  await claim(h, "alice@example.com");
  await age(h, 301);
  assert.equal((await claim(h, "alice@example.com")).body.code, "daily_limit");

  const h2 = await createHarness();
  await admin(h2, { action: "update_settings", settings: { max_claims_ip_day: 1 } });
  await claim(h2, "bob@example.com", { ip: "5.5.5.5" });
  await age(h2, 301);
  assert.equal((await claim(h2, "carl@example.com", { ip: "5.5.5.5" })).body.code, "daily_limit");
});

test("un solde vide bloque, alerte, puis reprend seul apres une recharge", async () => {
  const h = await createHarness({ balance: 100 });
  const r = await claim(h, "alice@example.com");
  assert.equal(r.body.code, "coin_empty");
  assert.match(h.alerts[0], /vide/);
  const callsBefore = h.mock.state.calls.length;
  assert.equal((await claim(h, "bob@example.com")).body.code, "coin_empty");
  assert.equal(h.mock.state.calls.length, callsBefore, "pas d'appel FaucetPay inutile");

  h.mock.state.balance = 1_000_000_000;
  await h.pg.query(`update coins set last_balance_at = now() - interval '6 minutes'`);
  assert.equal((await claim(h, "bob@example.com")).body.ok, true);
});

test("le passage sous le seuil de solde alerte une seule fois", async () => {
  const h = await createHarness({ balance: 100_300_000 });
  await claim(h, "a1@example.com");
  assert.equal(h.alerts.length, 0);
  await claim(h, "a2@example.com");
  assert.equal(h.alerts.length, 1);
  await claim(h, "a3@example.com");
  assert.equal(h.alerts.length, 1);
});

test("le plafond de la cle FaucetPay met le faucet en pause", async () => {
  const h = await createHarness();
  h.mock.state.keyCapReached = true;
  assert.equal((await claim(h, "alice@example.com")).body.code, "paused");
  assert.equal((await claim(h, "bob@example.com")).body.code, "paused");
  assert.equal(h.mock.state.calls.filter((c) => c.path === "/send").length, 1);
});

test("une crypto desactivee ou sans recompense est refusee", async () => {
  const h = await createHarness();
  assert.equal((await claim(h, "alice@example.com", { coin: "BTC" })).body.code, "coin_unavailable");
  assert.equal((await claim(h, "alice@example.com", { coin: "NOPE" })).body.code, "coin_unavailable");
  assert.equal(h.mock.state.calls.length, 0);
});

test("les trois types de bannissement bloquent", async () => {
  for (const [kind, value] of [["address", "alice@example.com"], ["account", "COMPTE"]]) {
    const h = await createHarness({ accounts: { "alice@example.com": "COMPTE" } });
    await admin(h, { action: "ban", kind, value });
    assert.equal((await claim(h, "alice@example.com")).body.code, "banned", kind);
    assert.equal(h.mock.state.payouts.length, 0);
  }
  const h = await createHarness();
  await claim(h, "alice@example.com", { ip: "6.6.6.6" });
  const list = await admin(h, { action: "claims", filter: "paid" });
  await admin(h, { action: "ban", kind: "ip", value: list.body.claims[0].ip_hash });
  await age(h, 301);
  assert.equal((await claim(h, "bob@example.com", { ip: "6.6.6.6" })).body.code, "banned");
  await admin(h, { action: "unban", kind: "ip", value: list.body.claims[0].ip_hash });
  assert.equal((await claim(h, "bob@example.com", { ip: "6.6.6.6" })).body.ok, true);
});

test("la relance admin termine une reclamation sans double paiement", async () => {
  const h = await createHarness();
  await claim(h, "panne-totale@example.com");
  const [c] = (await admin(h, { action: "claims", filter: "attention" })).body.claims;

  assert.equal((await admin(h, { action: "retry", id: c.id })).body.code, "too_soon");

  await age(h, 120);
  await h.pg.query(`update claims set address = 'alice@example.com' where id = $1`, [c.id]);
  const r = await admin(h, { action: "retry", id: c.id });
  assert.equal(r.body.ok, true);
  assert.equal(h.mock.state.payouts.length, 1);
  assert.equal((await admin(h, { action: "retry", id: c.id })).body.code, "not_retryable");
  assert.equal(h.mock.state.payouts.length, 1);
});

test("l'admin refuse sans le bon mot de passe et sans mot de passe assez long", async () => {
  const h = await createHarness();
  assert.equal((await admin(h, { action: "overview" }, "faux")).status, 401);
  h.deps.adminPassword = "court";
  assert.equal((await admin(h, { action: "overview" }, "court")).body.code, "admin_not_configured");
});

test("l'admin lit les soldes en direct", async () => {
  const h = await createHarness({ balance: 777 });
  const r = await admin(h, { action: "overview" });
  assert.equal(r.body.balance_error, null);
  assert.equal(r.body.coins.find((c) => c.code === "DOGE").last_balance_units, 777);
});

test("la page publique ne montre ni l'adresse entiere ni l'IP", async () => {
  const h = await createHarness();
  await claim(h, "alice@example.com", { ip: "7.7.7.7" });
  const res = await handleStatus(new Request("http://x/status"), h.deps);
  const text = await res.text();
  const body = JSON.parse(text);
  assert.equal(body.coins.length, 1);
  assert.equal(body.recent.length, 1);
  assert.equal(body.recent[0].who, "ali…com");
  assert.ok(!text.includes("alice@example.com"));
  assert.ok(!text.includes("ip_hash"));
});

test("l'IP n'est jamais stockee en clair", async () => {
  const h = await createHarness();
  await claim(h, "alice@example.com", { ip: "8.8.8.8" });
  const { rows } = await h.pg.query("select * from claims");
  assert.ok(!JSON.stringify(rows).includes("8.8.8.8"));
});

test("un visiteur sans droit ne peut ni lire les tables ni appeler les fonctions", async () => {
  const h = await createHarness();
  for (const role of ["anon", "authenticated"]) {
    await h.pg.exec(`set role ${role}`);
    for (const sql of [
      "select * from claims",
      "select * from settings",
      "select admin_overview()",
      "select public.pause_faucet('x')",
      "select public.reserve_claim('DOGE','a','a','a',null)",
    ]) {
      await assert.rejects(h.pg.query(sql), /permission denied/, `${role}: ${sql}`);
    }
    await h.pg.exec("reset role");
  }
});

test("normalisation des adresses", () => {
  assert.equal(normalizeAddress(" A+b@X.com "), "a@x.com");
  assert.equal(normalizeAddress("DGabc+1"), "dgabc+1");
});
