// Client de l'API FaucetPay v2. La cle doit avoir les droits read et send.

export type FpFailure = "insufficient" | "recipient" | "rate" | "cap" | "auth" | "rejected" | "network";

export interface FpResult {
  ok: boolean;
  failure?: FpFailure;
  message?: string;
  data?: Record<string, unknown>;
}

export function classifyFailure(http: number, code: unknown, message: string): FpFailure {
  const m = message.toLowerCase();
  if (http === 402 || code === 402 || m.includes("insufficient")) return "insufficient";
  if (m.includes("cap") && (http === 429 || code === 450)) return "cap";
  if (http === 429 || code === 459 || code === 450) return "rate";
  if (http === 401 || http === 403) return "auth";
  if (
    http === 404 || code === 456 || code === 457 ||
    /not payable|no user|does not belong|not belong|refused|blacklist|suspended|unverified|invalid address/.test(m)
  ) return "recipient";
  if (http >= 500) return "network";
  return "rejected";
}

export function createFaucetPay(key: string, fetchImpl: typeof fetch = fetch, baseUrl = "https://faucetpay.io/api/v2") {
  async function call(path: string, body: Record<string, unknown>): Promise<FpResult> {
    let res: Response;
    try {
      res = await fetchImpl(baseUrl + path, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      return { ok: false, failure: "network", message: String(err) };
    }
    let json: Record<string, unknown> = {};
    try {
      json = await res.json();
    } catch {
      return { ok: false, failure: "network", message: `Reponse illisible (HTTP ${res.status})` };
    }
    // La documentation montre deux enveloppes : {success: true} et {status: 200}.
    const ok = res.ok && (json.success === true || json.status === 200);
    const message = String(json.message ?? "");
    if (ok) return { ok: true, message, data: (json.data ?? json) as Record<string, unknown> };
    return { ok: false, failure: classifyFailure(res.status, json.status, message), message };
  }

  return {
    checkAddress: (address: string) => call("/check-address", { address }),
    send: (p: { idempotencyKey: string; to: string; amount: number; currency: string; ip?: string }) =>
      call("/send", {
        idempotency_key: p.idempotencyKey,
        to: p.to,
        amount: p.amount,
        currency: p.currency,
        ...(p.ip ? { ip_address: p.ip } : {}),
      }),
    balances: () => call("/balances", {}),
  };
}

export type FaucetPay = ReturnType<typeof createFaucetPay>;
