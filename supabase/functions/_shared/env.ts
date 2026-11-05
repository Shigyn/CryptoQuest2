// Branchement reel sur Supabase, Turnstile, FaucetPay et Telegram (Deno uniquement).
import { createFaucetPay } from "./faucetpay.ts";
import type { Deps } from "./core.ts";

declare const Deno: { env: { get(name: string): string | undefined } };

const env = (name: string) => Deno.env.get(name) ?? "";

export function depsFromEnv(): Deps {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: key };
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;

  return {
    rpc: async (fn, args = {}) => {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
      const text = await res.text();
      if (!res.ok) throw new Error(`rpc ${fn}: ${res.status} ${text}`);
      return text ? JSON.parse(text) : null;
    },
    fp: createFaucetPay(env("FAUCETPAY_API_KEY")),
    verifyCaptcha: async (token, ip) => {
      const secret = env("TURNSTILE_SECRET");
      if (!secret) return false; // Sans secret, personne ne passe.
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      });
      return (await res.json()).success === true;
    },
    alert: async (text) => {
      const bot = env("TELEGRAM_BOT_TOKEN");
      const chat = env("TELEGRAM_CHAT_ID");
      if (!bot || !chat) return;
      await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text }),
      }).catch((err) => console.error("alerte Telegram", err));
    },
    // Format courant des reseaux de liens : JSON avec shortenedUrl.
    shorten: async (apiUrl, longUrl) => {
      try {
        const res = await fetch(apiUrl.replace("{url}", encodeURIComponent(longUrl)), { signal: AbortSignal.timeout(10000) });
        const body = await res.json();
        return body.shortenedUrl ?? body.shortened_url ?? body.short ?? null;
      } catch (err) {
        console.error("raccourcisseur", err);
        return null;
      }
    },
    prices: async (ids) => {
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=eur&ids=${encodeURIComponent(ids.join(","))}`;
        const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const body = await res.json();
        return Object.fromEntries(Object.entries(body).map(([id, v]: [string, any]) => [id, Number(v?.eur)]));
      } catch (err) {
        console.error("prix", err);
        return null;
      }
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    ipPepper: env("IP_PEPPER"),
    adminPassword: env("ADMIN_PASSWORD"),
    cronSecret: env("CRON_SECRET"),
    allowedOrigin: env("ALLOWED_ORIGIN") || "*",
    siteUrl: env("SITE_URL"),
  };
}
