import { handleCron } from "../_shared/core.ts";
import { depsFromEnv } from "../_shared/env.ts";

declare const Deno: { serve(h: (req: Request) => Response | Promise<Response>): void };

const deps = depsFromEnv();
Deno.serve((req) => handleCron(req, deps));
