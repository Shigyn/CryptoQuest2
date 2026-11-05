// Essai local : vraie base Postgres en memoire, FaucetPay simule, aucun argent reel.
// Mot de passe du dashboard local : mot-de-passe-de-test-long
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createHarness } from "./harness.mjs";
import { handleAdmin, handleApi, handleCron, handlePostback } from "../supabase/functions/_shared/core.ts";

const PORT = Number(process.env.PORT) || 8188;
const root = fileURLToPath(new URL("../public", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css" };

const h = await createHarness({ siteUrl: `http://localhost:${PORT}/` });
const handlers = { api: handleApi, admin: handleAdmin, postback: handlePostback, cron: handleCron };

// Contenus d'essai
await h.rpc("admin_save_ptc", { p: { title: "Pub d'essai", url: `http://localhost:${PORT}/legal.html`, reward_tokens: 10, duration_seconds: 5, max_views: 100, price_eur_per_view: 0.002 } });
await h.rpc("admin_save_shortlink", { p: { name: "Lien d'essai", api_url: "https://exemple.invalid/api?url={url}", reward_tokens: 15, daily_limit: 2, revenue_eur_per_view: 0.003 } });
await h.rpc("admin_save_offerwall", { p: { code: "essai", name: "Mur d'essai", iframe_url: `http://localhost:${PORT}/mur-essai?user={user}`, postback_secret: "secret-essai" } });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const fn = url.pathname.match(/^\/functions\/v1\/(\w+)$/)?.[1];

  if (fn && handlers[fn]) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers(req.headers);
    headers.set("cf-connecting-ip", url.searchParams.get("ip") || "127.0.0.1");
    const request = new Request(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await handlers[fn](request, h.deps);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
    return;
  }

  if (url.pathname === "/config.js") {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    // 1x00000000000000000000AA : cle d'essai publique de Cloudflare, toujours valide.
    res.end(`window.FAUCET_CONFIG = { SITE_NAME: "CryptoCoin", TOKEN: "CC", API_BASE: "/functions/v1", TURNSTILE_SITE_KEY: "1x00000000000000000000AA", ADS: { top: "", bottom: "" } };`);
    return;
  }

  // Le faux reseau de liens renvoie directement sur le site.
  if (url.pathname === "/retour-simule") {
    res.writeHead(302, { Location: url.searchParams.get("to") }).end();
    return;
  }
  if (url.pathname === "/mur-essai") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<p style="font-family:sans-serif;padding:20px">Mur d'offres simulé pour ${url.searchParams.get("user")?.replace(/[^a-z0-9]/gi, "")}.</p>`);
    return;
  }

  const path = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
  try {
    const file = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404).end("Introuvable");
  }
}).listen(PORT, () => console.log(`CryptoCoin local : http://localhost:${PORT}`));
