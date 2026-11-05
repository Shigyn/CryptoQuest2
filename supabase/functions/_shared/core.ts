// Logique du serveur. Aucune dependance a Deno, pour tourner aussi dans les tests.
import type { FaucetPay, FpResult } from "./faucetpay.ts";

export type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<any>;

export interface Deps {
  rpc: Rpc;
  fp: FaucetPay;
  verifyCaptcha: (token: string, ip: string) => Promise<boolean>;
  alert: (text: string) => Promise<void>;
  shorten: (apiUrl: string, longUrl: string) => Promise<string | null>;
  // Prix en euros par identifiant CoinGecko. Un seul appel pour toutes les cryptos.
  prices: (ids: string[]) => Promise<Record<string, number> | null>;
  sleep: (ms: number) => Promise<void>;
  ipPepper: string;
  adminPassword: string;
  cronSecret: string;
  allowedOrigin: string;
  siteUrl: string;
}

function cors(d: Deps): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": d.allowedOrigin,
    "Access-Control-Allow-Headers": "content-type, x-admin-password, authorization, apikey",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function json(d: Deps, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(d) },
  });
}

const refuse = (d: Deps, status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(d, status, { ok: false, code, ...extra });

const STATUS_BY_CODE: Record<string, number> = {
  cooldown: 429, daily_limit: 429, too_many_signups: 429, banned: 403, unauthorized: 401, not_found: 404,
  already_done: 409, not_reached: 409, too_soon: 409, email_taken: 409, fp_taken: 409, paused: 503, coin_empty: 503,
};

function result(d: Deps, r: { ok: boolean; code?: string }): Response {
  return json(d, r.ok ? 200 : STATUS_BY_CODE[r.code ?? ""] ?? 400, r);
}

export function clientIp(req: Request): string | null {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

const PBKDF2_ROUNDS = 100_000;

async function pbkdf2(password: string, saltHex: string, rounds: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = Uint8Array.from(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: rounds }, key, 256));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return `${PBKDF2_ROUNDS}:${salt}:${await pbkdf2(password, salt, PBKDF2_ROUNDS)}`;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [rounds, salt, hash] = stored.split(":");
  return constantTimeEqual(await pbkdf2(password, salt, Number(rounds)), hash);
}

async function sameSecret(a: string, b: string): Promise<boolean> {
  return constantTimeEqual(await sha256(a), await sha256(b));
}

// Majuscules et alias d'e-mail : une seule personne, une seule cle.
export function normalizeAddress(address: string): string {
  const a = address.trim().toLowerCase();
  const at = a.indexOf("@");
  if (at < 1) return a;
  return a.slice(0, at).split("+")[0] + a.slice(at);
}

const ADDRESS_RE = /^[A-Za-z0-9@._+:\-]{3,128}$/;
const SHORTLINK_MIN_SECONDS = 10;

function numberOrNull(v: unknown): number | null {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? null : Math.trunc(n);
}

// Envoie un retrait reserve. Sans reponse de FaucetPay, une relance avec la meme cle ne paie jamais deux fois.
async function sendWithdrawal(
  d: Deps,
  w: { id: string; to: string; amount: number; coin: string; ip?: string },
): Promise<FpResult> {
  const params = { idempotencyKey: w.id, to: w.to, amount: w.amount, currency: w.coin, ip: w.ip };
  let sent = await d.fp.send(params);
  if (!sent.ok && sent.failure === "network") sent = await d.fp.send(params);

  if (sent.ok) {
    const done = await d.rpc("finish_withdrawal", {
      p_id: w.id,
      p_status: "paid",
      p_payout_id: String(sent.data?.payout_id ?? ""),
      p_error: null,
      p_balance_units: numberOrNull(sent.data?.balance),
    });
    if (done?.low_balance) await d.alert(`Solde ${w.coin} bas : ${done.balance_units} unités.`);
    return sent;
  }

  await d.rpc("finish_withdrawal", {
    p_id: w.id,
    p_status: sent.failure === "network" ? "unknown" : "failed",
    p_payout_id: null,
    p_error: `${sent.failure}: ${sent.message ?? ""}`.slice(0, 300),
    p_balance_units: sent.failure === "insufficient" ? 0 : null,
  });

  if (sent.failure === "insufficient") await d.alert(`Solde ${w.coin} vide : les retraits sont refusés.`);
  if (sent.failure === "cap" || sent.failure === "auth") {
    const reason = sent.failure === "cap" ? "Plafond quotidien de la clé FaucetPay atteint" : "Clé FaucetPay refusée";
    await d.rpc("pause_faucet", { p_reason: reason });
    await d.alert(`Site en pause : ${reason}.`);
  }
  return sent;
}

function failureResponse(d: Deps, sent: FpResult): Response {
  switch (sent.failure) {
    case "recipient":
      return refuse(d, 400, "invalid_address");
    case "insufficient":
      return refuse(d, 503, "coin_empty");
    case "network":
      return refuse(d, 202, "pending");
    case "cap":
    case "auth":
      return refuse(d, 503, "paused");
    default:
      return refuse(d, 503, "try_later");
  }
}

async function startSession(d: Deps, userId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await d.rpc("create_session", { p_token_hash: await sha256(token), p_user: userId });
  return token;
}

export async function handleApi(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(d) });
  if (req.method !== "POST") return refuse(d, 405, "method");

  let b: any;
  try {
    b = await req.json();
  } catch {
    return refuse(d, 400, "bad_request");
  }
  const ip = clientIp(req);
  if (!ip) return refuse(d, 400, "bad_request");
  const ipHash = await sha256(d.ipPepper + ip);
  const captchaOk = async () => Boolean(b.captcha) && (await d.verifyCaptcha(String(b.captcha), ip));

  // Sans compte
  if (b.action === "status") return json(d, 200, await d.rpc("public_status"));

  // Une seule entree : l'adresse FaucetPay. Compte cree a la premiere visite.
  // Mot de passe demande seulement si le membre en a choisi un.
  if (b.action === "login") {
    // Pas de captcha ici : zero friction. Les comptes proteges se verrouillent apres 5 erreurs.
    const address = String(b.address ?? "").trim();
    if (!ADDRESS_RE.test(address)) return refuse(d, 400, "invalid_address");
    const norm = normalizeAddress(address);

    let found = await d.rpc("find_fp_user", { p_norm: norm });
    let userId: string | null = null;
    let passwordHash: string | null = null;
    let locked = false;
    let created = false;
    if (found) {
      if (found.banned) return refuse(d, 403, "banned");
      userId = found.user_id;
      passwordHash = found.password_hash;
      locked = Boolean(found.locked);
    } else {
      const check = await d.fp.checkAddress(address);
      if (!check.ok) {
        return check.failure === "recipient" || check.failure === "rejected"
          ? refuse(d, 400, "invalid_address")
          : refuse(d, 503, "try_later");
      }
      found = await d.rpc("fp_login", {
        p_address: address,
        p_norm: norm,
        p_hash: (check.data?.payout_user_hash as string) ?? null,
        p_ip_hash: ipHash,
        p_ref: b.ref ? String(b.ref) : null,
      });
      if (!found.ok) return result(d, found);
      userId = found.user_id;
      passwordHash = found.password_hash ?? null;
      locked = Boolean(found.locked);
      created = found.created;
    }

    if (passwordHash) {
      if (!b.password) return refuse(d, 401, "password_required");
      if (locked) return refuse(d, 429, "locked");
      const good = await checkPassword(String(b.password), passwordHash);
      await d.rpc("login_result", { p_user: userId, p_ok: good });
      if (!good) return refuse(d, 401, "bad_password");
    }
    return json(d, 200, { ok: true, created, session: await startSession(d, userId!) });
  }

  // Avec compte
  const sessionHash = await sha256(String(b.session ?? ""));
  const userId: string | null = b.session ? await d.rpc("session_user_id", { p_token_hash: sessionHash, p_ip_hash: ipHash }) : null;
  if (!userId) return refuse(d, 401, "unauthorized");

  switch (b.action) {
    case "logout":
      await d.rpc("delete_session", { p_token_hash: sessionHash });
      return json(d, 200, { ok: true });

    case "me":
      return json(d, 200, { ok: true, ...(await d.rpc("user_profile", { p_user: userId })) });

    case "set_password": {
      const password = String(b.password ?? "");
      if (password.length < 8 || password.length > 200) return refuse(d, 400, "weak_password");
      await d.rpc("set_user_password", { p_user: userId, p_hash: await hashPassword(password) });
      // Les autres sessions sont fermees ; celle-ci est remplacee.
      return json(d, 200, { ok: true, session: await startSession(d, userId) });
    }

    case "set_coin":
      return result(d, await d.rpc("set_payout_coin", { p_user: userId, p_coin: String(b.coin ?? "") }));

    case "claim": {
      if (!(await captchaOk())) return refuse(d, 400, "captcha");
      const r = await d.rpc("faucet_claim", { p_user: userId, p_ip_hash: ipHash });
      if (r.tripped) await d.alert("Site en pause : plafond horaire atteint.");
      return result(d, r);
    }

    case "daily":
      return result(d, await d.rpc("claim_daily", { p_user: userId, p_ip_hash: ipHash }));

    case "wheel":
      return result(d, await d.rpc("spin_wheel", { p_user: userId, p_ip_hash: ipHash }));

    case "challenge":
      return result(d, await d.rpc("claim_challenge", { p_user: userId, p_id: Number(b.id), p_ip_hash: ipHash }));

    case "withdraw": {
      const r = await d.rpc("reserve_withdrawal", { p_user: userId, p_kind: "instant", p_ip_hash: ipHash });
      if (!r.ok) {
        if (r.tripped) await d.alert("Site en pause : plafond de paiement sur 24 h atteint.");
        return result(d, r);
      }
      const sent = await sendWithdrawal(d, { id: r.id, to: r.to, amount: r.amount_units, coin: r.coin, ip });
      if (!sent.ok) return failureResponse(d, sent);
      return json(d, 200, {
        ok: true,
        tokens: r.tokens,
        coin: r.coin,
        amount_units: r.amount_units,
        decimals: r.decimals,
        payout_id: String(sent.data?.payout_id ?? ""),
      });
    }

    case "earn_list":
      return json(d, 200, {
        ok: true,
        ptc: await d.rpc("ptc_list", { p_user: userId }),
        shortlinks: await d.rpc("shortlink_list", { p_user: userId }),
        offerwalls: await d.rpc("offerwall_list"),
      });

    case "ptc_start":
      return result(d, await d.rpc("ptc_start", { p_user: userId, p_id: Number(b.id), p_ip_hash: ipHash }));

    case "ptc_complete":
      if (!(await captchaOk())) return refuse(d, 400, "captcha");
      return result(d, await d.rpc("ptc_complete", { p_user: userId, p_id: Number(b.id), p_ip_hash: ipHash }));

    case "shortlink_start": {
      if (!(await captchaOk())) return refuse(d, 400, "captcha");
      const token = crypto.randomUUID().replaceAll("-", "");
      const r = await d.rpc("shortlink_start", { p_user: userId, p_id: Number(b.id), p_token: token, p_ip_hash: ipHash });
      if (!r.ok) return result(d, r);
      const url = await d.shorten(r.api_url, `${d.siteUrl}?sl=${token}`);
      if (!url) return refuse(d, 503, "try_later");
      return json(d, 200, { ok: true, url });
    }

    case "shortlink_complete":
      return result(d, await d.rpc("shortlink_complete", {
        p_user: userId,
        p_token: String(b.token ?? ""),
        p_min_seconds: SHORTLINK_MIN_SECONDS,
      }));

    default:
      return refuse(d, 400, "bad_request");
  }
}

// Appele par le reseau d'offres, jamais par le visiteur. Le secret authentifie le reseau.
export async function handlePostback(req: Request, d: Deps): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const wall = await d.rpc("get_offerwall", { p_code: q.get("wall") ?? "" });
  if (!wall || !(await sameSecret(q.get("secret") ?? "", wall.postback_secret))) return new Response("forbidden", { status: 403 });
  const tx = q.get("tx");
  const user = q.get("user");
  if (!tx || !user) return new Response("missing", { status: 400 });

  // Annulation : la valeur choisie pour ce reseau, ou un montant negatif.
  const usd = Number(q.get("usd"));
  const status = q.get("status");
  if ((status !== null && status === wall.reversed_status) || (Number.isFinite(usd) && usd < 0)) {
    await d.rpc("offer_reverse", { p_code: wall.code, p_tx: tx });
    return new Response("ok");
  }
  if (!Number.isFinite(usd)) return new Response("invalid", { status: 400 });
  const r = await d.rpc("offer_postback", { p_code: wall.code, p_tx: tx, p_ref_code: user, p_usd: usd });
  return r.ok ? new Response("ok") : new Response(r.code, { status: 400 });
}

// Met a jour les taux. Un ecart de plus de 50 % est ignore : prix douteux, on garde l'ancien.
export async function refreshRates(d: Deps, force = false): Promise<{ updated: string[]; skipped: string[]; error?: string }> {
  const t = await d.rpc("rate_targets");
  if (!force && !t.auto) return { updated: [], skipped: [] };
  const coins: { code: string; price_id: string; per_eur: number | null }[] = t.coins;
  if (!coins.length) return { updated: [], skipped: [] };
  const prices = await d.prices([...new Set(coins.map((c) => c.price_id))]);
  if (!prices) return { updated: [], skipped: [], error: "Service de prix injoignable" };
  const next: Record<string, number> = {};
  const skipped: string[] = [];
  for (const c of coins) {
    const eurPrice = prices[c.price_id];
    if (!(eurPrice > 0)) { skipped.push(c.code); continue; }
    const perEur = Number((1 / eurPrice).toPrecision(8));
    const old = c.per_eur === null ? null : Number(c.per_eur);
    if (old && Math.abs(perEur - old) / old > 0.5) { skipped.push(c.code); continue; }
    next[c.code] = perEur;
  }
  if (Object.keys(next).length) await d.rpc("set_rates", { p: next });
  if (skipped.length) await d.alert(`Taux non mis à jour pour ${skipped.join(", ")} : prix absent ou écart de plus de 50 %.`);
  return { updated: Object.keys(next), skipped };
}

// Lot horaire : paie tout ce qui a ete valide. Limite a un paiement par seconde, pour l'API FaucetPay.
export async function handleCron(req: Request, d: Deps, budgetMs = 120_000): Promise<Response> {
  if (d.cronSecret.length < 16 || !(await sameSecret(req.headers.get("authorization") ?? "", `Bearer ${d.cronSecret}`))) {
    return new Response("forbidden", { status: 403 });
  }
  const started = Date.now();
  // Taux d'abord, pour payer au cours de l'heure.
  const rates = await refreshRates(d).catch((err) => ({ updated: [], skipped: [], error: String(err) }));
  const users: string[] = await d.rpc("hourly_batch_users", { p_limit: 200 });
  let paid = 0, failed = 0, skipped = 0;
  for (const id of users) {
    if (Date.now() - started > budgetMs) break;
    const r = await d.rpc("reserve_withdrawal", { p_user: id, p_kind: "hourly", p_ip_hash: "lot-horaire" });
    if (!r.ok) {
      if (r.code === "paused" || r.code === "coin_empty") {
        if (r.tripped) await d.alert("Site en pause : plafond de paiement sur 24 h atteint.");
        break;
      }
      skipped++;
      continue;
    }
    const sent = await sendWithdrawal(d, { id: r.id, to: r.to, amount: r.amount_units, coin: r.coin });
    if (sent.ok) paid++;
    else {
      failed++;
      if (sent.failure === "cap" || sent.failure === "auth" || sent.failure === "insufficient") break;
    }
    await d.sleep(1000);
  }
  return json(d, 200, { ok: true, paid, failed, skipped, candidates: users.length, rates });
}

export async function handleAdmin(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(d) });
  if (req.method !== "POST") return refuse(d, 405, "method");
  if (d.adminPassword.length < 16) return refuse(d, 503, "admin_not_configured");
  if (!(await sameSecret(req.headers.get("x-admin-password") ?? "", d.adminPassword))) {
    return refuse(d, 401, "unauthorized");
  }

  let b: any;
  try {
    b = await req.json();
  } catch {
    return refuse(d, 400, "bad_request");
  }
  const ok = (extra: Record<string, unknown> = {}) => json(d, 200, { ok: true, ...extra });

  try {
    switch (b.action) {
      case "overview": {
        // Les soldes viennent de FaucetPay ; sans reponse, on garde le dernier connu.
        const live = await d.fp.balances();
        const rows = live.ok ? (live.data?.balances ?? live.data) : null;
        let balanceError: string | null = live.ok ? null : (live.message ?? "FaucetPay ne répond pas");
        const known: Record<string, unknown>[] = Array.isArray(rows)
          ? rows
          : rows && typeof rows === "object"
          ? Object.entries(rows).map(([currency, balance]) => ({ currency, balance }))
          : [];
        for (const row of known) {
          const code = String(row.currency ?? row.coin ?? "").toUpperCase();
          const units = numberOrNull(row.balance);
          if (code && units !== null) await d.rpc("admin_set_balance", { p_code: code, p_units: units });
        }
        if (live.ok && known.length === 0) balanceError = "Format de solde inattendu";
        return ok({ ...(await d.rpc("admin_overview")), balance_error: balanceError });
      }
      case "earnings":
        return ok({ earnings: await d.rpc("admin_earnings", { p_status: String(b.status ?? "pending"), p_limit: 100 }) });
      case "validate":
        return ok(await d.rpc("admin_validate_earnings", { p_ids: b.ids ?? [], p_all_clean: Boolean(b.all_clean) }));
      case "reject":
        return ok(await d.rpc("admin_reject_earnings", { p_ids: b.ids ?? [] }));
      case "withdrawals":
        return ok({ withdrawals: await d.rpc("admin_withdrawals", { p_filter: String(b.filter ?? "all"), p_limit: 100 }) });
      case "users":
        return ok({ users: await d.rpc("admin_users", { p_search: String(b.search ?? "") }) });
      case "ban_user":
        await d.rpc("admin_ban_user", { p_id: String(b.id), p_banned: Boolean(b.banned), p_reason: b.reason ?? null });
        return ok();
      case "ban":
        await d.rpc("admin_ban", { p_kind: String(b.kind), p_value: String(b.value), p_reason: b.reason ?? null });
        return ok();
      case "unban":
        await d.rpc("admin_unban", { p_kind: String(b.kind), p_value: String(b.value) });
        return ok();
      case "update_settings":
        await d.rpc("admin_update_settings", { p: b.settings ?? {} });
        return ok();
      case "update_coin":
        await d.rpc("admin_update_coin", { p_code: String(b.code), p: b.coin ?? {} });
        return ok();
      case "save_ptc":
        await d.rpc("admin_save_ptc", { p: b.item ?? {} });
        return ok();
      case "save_shortlink":
        await d.rpc("admin_save_shortlink", { p: b.item ?? {} });
        return ok();
      case "save_offerwall":
        await d.rpc("admin_save_offerwall", { p: b.item ?? {} });
        return ok();
      case "save_challenge":
        await d.rpc("admin_save_challenge", { p: b.item ?? {} });
        return ok();
      case "refresh_rates":
        return ok(await refreshRates(d, true));
      case "run_batch":
        return handleCron(new Request(req.url, { headers: { authorization: `Bearer ${d.cronSecret}` } }), d, 100_000);
      case "retry": {
        const w = await d.rpc("admin_get_withdrawal", { p_id: String(b.id) });
        if (!w || !["reserved", "unknown"].includes(w.status)) return refuse(d, 409, "not_retryable");
        // Attente d'une requete peut-etre encore en cours.
        if (Date.now() - new Date(w.created_at).getTime() < 60_000) return refuse(d, 409, "too_soon");
        const sent = await sendWithdrawal(d, { id: w.id, to: w.to_address, amount: Number(w.amount_units), coin: w.coin });
        return json(d, 200, { ok: sent.ok, message: sent.message });
      }
      default:
        return refuse(d, 400, "bad_request");
    }
  } catch (err) {
    console.error(err);
    return refuse(d, 500, "server_error", { message: String(err) });
  }
}
