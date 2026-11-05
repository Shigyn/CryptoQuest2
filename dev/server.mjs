// Essai local : vraie base Postgres en memoire, FaucetPay simule, aucun argent reel.
// Mot de passe du dashboard local : mot-de-passe-de-test-long
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createHarness } from "./harness.mjs";
import { handleAdmin, handleClaim, handleStatus } from "../supabase/functions/_shared/core.ts";

const PORT = Number(process.env.PORT) || 8188;
const root = fileURLToPath(new URL("../public", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };

const h = await createHarness();
const handlers = { claim: handleClaim, status: handleStatus, admin: handleAdmin };

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
    res.end(`window.FAUCET_CONFIG = { SITE_NAME: "Faucet (essai)", API_BASE: "/functions/v1", TURNSTILE_SITE_KEY: "1x00000000000000000000AA", ADS: { top: "", bottom: "" } };`);
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
}).listen(PORT, () => console.log(`Faucet local : http://localhost:${PORT}`));
