// Banc d'essai : vrai Postgres (PGlite), FaucetPay simule. Aucun appel reseau, aucun argent reel.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createFaucetPay } from "../supabase/functions/_shared/faucetpay.ts";

const migration = new URL("../supabase/migrations/20261105000000_init.sql", import.meta.url);

export async function createDb() {
  const pg = new PGlite();
  await pg.exec(`
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await pg.exec(readFileSync(migration, "utf8"));
  const rpc = async (fn, args = {}) => {
    const keys = Object.keys(args);
    const call = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
    const { rows } = await pg.query(`select public.${fn}(${call}) as r`, keys.map((k) => args[k]));
    return rows[0]?.r ?? null;
  };
  return { pg, rpc };
}

// Comportement selon l'adresse : inconnu@x (compte inexistant), panne@x (coupure puis reprise),
// panne-totale@x (FaucetPay ne repond plus). Une meme idempotency_key ne paie qu'une fois.
export function createMockFaucetPay({ balance = 1_000_000_000, accounts = {} } = {}) {
  const state = {
    balance,
    payouts: [],
    seen: new Map(),
    calls: [],
    failOnce: new Set(),
    keyCapReached: false,
    keyRevoked: false,
  };

  const reply = (http, body) =>
    new Response(JSON.stringify(body), { status: http, headers: { "Content-Type": "application/json" } });

  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname.replace("/api/v2", "");
    const body = JSON.parse(init.body);
    state.calls.push({ path, body });
    if (state.keyRevoked) return reply(401, { success: false, message: "Unauthorized" });

    const hashOf = (a) => accounts[a] ?? "hash-" + a.toLowerCase();

    if (path === "/check-address") {
      if (body.address.startsWith("inconnu")) {
        return reply(400, { success: false, status: 456, message: "Recipient is not payable" });
      }
      return reply(200, { success: true, message: "OK", data: { payout_user_hash: hashOf(body.address) } });
    }

    if (path === "/balances") {
      return reply(200, { success: true, message: "OK", data: { balances: [{ currency: "DOGE", balance: state.balance }] } });
    }

    if (path === "/send") {
      if (body.to.startsWith("panne-totale")) throw new Error("connection reset");
      if (body.to.startsWith("panne") && !state.failOnce.has(body.idempotency_key)) {
        state.failOnce.add(body.idempotency_key);
        // Le paiement passe, mais la reponse se perd : c'est le cas dangereux.
        state.balance -= body.amount;
        state.payouts.push(body);
        state.seen.set(body.idempotency_key, 1);
        throw new Error("timeout");
      }
      if (state.keyCapReached) {
        return reply(429, { success: false, message: "Daily payout cap exceeded" });
      }
      if (body.to.startsWith("refuse")) {
        return reply(400, { success: false, status: 457, message: "Recipient refused by anti-fraud rules" });
      }
      if (!state.seen.has(body.idempotency_key)) {
        if (state.balance < body.amount) {
          return reply(402, { success: false, status: 402, message: "Insufficient balance" });
        }
        state.balance -= body.amount;
        state.payouts.push(body);
        state.seen.set(body.idempotency_key, state.payouts.length);
      }
      return reply(200, {
        success: true,
        message: "OK",
        data: {
          currency: body.currency,
          balance: state.balance,
          payout_id: 1000 + state.seen.get(body.idempotency_key),
          payout_user_hash: hashOf(body.to),
        },
      });
    }
    return reply(404, { success: false, message: "Not found" });
  };

  return { state, fp: createFaucetPay("cle-de-test", fetchImpl) };
}

export async function createHarness(options = {}) {
  const { pg, rpc } = await createDb();
  const mock = createMockFaucetPay(options);
  const alerts = [];
  const deps = {
    rpc,
    fp: mock.fp,
    verifyCaptcha: async (token) => token !== "mauvais",
    alert: async (t) => void alerts.push(t),
    ipPepper: "poivre",
    adminPassword: "mot-de-passe-de-test-long",
    allowedOrigin: "*",
  };
  return { pg, rpc, deps, mock, alerts };
}
