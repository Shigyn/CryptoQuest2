import { handleApi } from "../_shared/core.ts";
import { depsFromEnv } from "../_shared/env.ts";

declare const Deno: { serve(h: (req: Request) => Response | Promise<Response>): void };

const deps = depsFromEnv();
Deno.serve(async (req) => {
  try {
    return await handleApi(req, deps);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, code: "try_later" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": deps.allowedOrigin },
    });
  }
});
