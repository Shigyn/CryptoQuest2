// Logique des trois fonctions. Aucune dependance a Deno, pour tourner aussi dans les tests.
import type { FaucetPay, FpResult } from "./faucetpay.ts";

export type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<any>;

export interface Deps {
  rpc: Rpc;
  fp: FaucetPay;
  verifyCaptcha: (token: string, ip: string) => Promise<boolean>;
  alert: (text: string) => Promise<void>;
  ipPepper: string;
  adminPassword: string;
  allowedOrigin: string;
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

export function clientIp(req: Request): string | null {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

export async function sha256(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// E-mail + alias, majuscules : une seule personne, une seule cle pour le delai.
export function normalizeAddress(address: string): string {
  const a = address.trim().toLowerCase();
  const at = a.indexOf("@");
  if (at < 1) return a;
  return a.slice(0, at).split("+")[0] + a.slice(at);
}

const ADDRESS_RE = /^[A-Za-z0-9@._+:\-]{3,128}$/;
const COIN_RE = /^[A-Z0-9]{2,10}$/;

function blockResponse(d: Deps, b: { reason: string; retry_after?: number }): Response {
  const status = b.reason === "cooldown" || b.reason === "daily_limit" ? 429 : b.reason === "banned" ? 403 : 503;
  return refuse(d, status, b.reason, b.retry_after ? { retry_after: b.retry_after } : {});
}

function numberOrNull(v: unknown): number | null {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? null : Math.trunc(n);
}

// Envoie et enregistre. Sans reponse de FaucetPay, une relance avec la meme cle ne paie jamais deux fois.
async function sendAndFinish(
  d: Deps,
  claim: { id: string; to: string; amount: number; coin: string; ip?: string },
): Promise<FpResult> {
  const params = { idempotencyKey: claim.id, to: claim.to, amount: claim.amount, currency: claim.coin, ip: claim.ip };
  let sent = await d.fp.send(params);
  if (!sent.ok && sent.failure === "network") sent = await d.fp.send(params);

  if (sent.ok) {
    const done = await d.rpc("finish_claim", {
      p_id: claim.id,
      p_status: "paid",
      p_payout_id: String(sent.data?.payout_id ?? ""),
      p_error: null,
      p_user_hash: sent.data?.payout_user_hash ?? null,
      p_balance_units: numberOrNull(sent.data?.balance),
    });
    if (done?.low_balance) await d.alert(`Solde ${claim.coin} bas : ${done.balance_units} unites.`);
    return sent;
  }

  await d.rpc("finish_claim", {
    p_id: claim.id,
    p_status: sent.failure === "network" ? "unknown" : "failed",
    p_payout_id: null,
    p_error: `${sent.failure}: ${sent.message ?? ""}`.slice(0, 300),
    p_user_hash: null,
    p_balance_units: sent.failure === "insufficient" ? 0 : null,
  });

  if (sent.failure === "insufficient") await d.alert(`Solde ${claim.coin} vide : les paiements sont refuses.`);
  if (sent.failure === "cap" || sent.failure === "auth") {
    const reason = sent.failure === "cap"
      ? "Plafond quotidien de la cle FaucetPay atteint"
      : "Cle FaucetPay refusee";
    await d.rpc("pause_faucet", { p_reason: reason });
    await d.alert(`Faucet en pause : ${reason}.`);
  }
  return sent;
}

export async function handleClaim(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(d) });
  if (req.method !== "POST") return refuse(d, 405, "method");

  let body: { coin?: unknown; address?: unknown; captcha?: unknown };
  try {
    body = await req.json();
  } catch {
    return refuse(d, 400, "bad_request");
  }
  const coin = String(body.coin ?? "").toUpperCase();
  const address = String(body.address ?? "").trim();
  const token = String(body.captcha ?? "");
  if (!COIN_RE.test(coin)) return refuse(d, 400, "coin_unavailable");
  if (!ADDRESS_RE.test(address)) return refuse(d, 400, "invalid_address");
  if (!token) return refuse(d, 400, "captcha");

  const ip = clientIp(req);
  if (!ip) return refuse(d, 400, "bad_request");
  if (!(await d.verifyCaptcha(token, ip))) return refuse(d, 400, "captcha");

  const ipHash = await sha256(d.ipPepper + ip);
  const norm = normalizeAddress(address);

  const pre = await d.rpc("precheck_claim", { p_coin: coin, p_address_norm: norm, p_ip_hash: ipHash });
  if (!pre.ok) return blockResponse(d, pre);

  let userHash: string | null = pre.user_hash ?? null;
  if (!pre.known) {
    const check = await d.fp.checkAddress(address);
    if (!check.ok) {
      return check.failure === "recipient" || check.failure === "rejected"
        ? refuse(d, 400, "invalid_address")
        : refuse(d, 503, "try_later");
    }
    userHash = (check.data?.payout_user_hash as string) ?? null;
  }

  const r = await d.rpc("reserve_claim", {
    p_coin: coin,
    p_address: address,
    p_address_norm: norm,
    p_ip_hash: ipHash,
    p_user_hash: userHash,
  });
  if (!r.ok) {
    if (r.tripped) await d.alert("Faucet en pause : plafond horaire atteint.");
    return blockResponse(d, r);
  }

  const sent = await sendAndFinish(d, { id: r.claim_id, to: address, amount: r.amount_units, coin, ip });
  if (sent.ok) {
    return json(d, 200, {
      ok: true,
      coin,
      amount_units: r.amount_units,
      decimals: r.decimals,
      payout_id: String(sent.data?.payout_id ?? ""),
    });
  }
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

export async function handleStatus(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(d) });
  return json(d, 200, await d.rpc("public_status"));
}

async function samePassword(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function handleAdmin(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(d) });
  if (req.method !== "POST") return refuse(d, 405, "method");
  if (d.adminPassword.length < 16) return refuse(d, 503, "admin_not_configured");
  if (!(await samePassword(req.headers.get("x-admin-password") ?? "", d.adminPassword))) {
    return refuse(d, 401, "unauthorized");
  }

  let b: any;
  try {
    b = await req.json();
  } catch {
    return refuse(d, 400, "bad_request");
  }

  try {
    switch (b.action) {
      case "overview": {
        // Les soldes viennent de FaucetPay ; sans reponse, on garde le dernier connu.
        const live = await d.fp.balances();
        const rows = live.ok ? (live.data?.balances ?? live.data) : null;
        let balanceError: string | null = live.ok ? null : (live.message ?? "FaucetPay ne repond pas");
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
        const overview = await d.rpc("admin_overview");
        return json(d, 200, { ok: true, ...overview, balance_error: balanceError });
      }
      case "claims":
        return json(d, 200, {
          ok: true,
          claims: await d.rpc("admin_claims", { p_filter: String(b.filter ?? "all"), p_limit: 100 }),
        });
      case "update_settings":
        await d.rpc("admin_update_settings", { p: b.settings ?? {} });
        return json(d, 200, { ok: true });
      case "update_coin":
        await d.rpc("admin_update_coin", { p_code: String(b.code), p: b.coin ?? {} });
        return json(d, 200, { ok: true });
      case "ban":
        await d.rpc("admin_ban", { p_kind: String(b.kind), p_value: String(b.value), p_reason: b.reason ?? null });
        return json(d, 200, { ok: true });
      case "unban":
        await d.rpc("admin_unban", { p_kind: String(b.kind), p_value: String(b.value) });
        return json(d, 200, { ok: true });
      case "retry": {
        const c = await d.rpc("admin_get_claim", { p_id: String(b.id) });
        if (!c || !["reserved", "unknown"].includes(c.status)) return refuse(d, 409, "not_retryable");
        // Attente d'une requete peut-etre encore en cours.
        if (Date.now() - new Date(c.created_at).getTime() < 60_000) return refuse(d, 409, "too_soon");
        const sent = await sendAndFinish(d, { id: c.id, to: c.address, amount: Number(c.amount_units), coin: c.coin });
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
