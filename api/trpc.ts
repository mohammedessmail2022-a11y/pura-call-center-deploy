import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { createContext } from "../server/_core/context";
import { runStartupMigrations } from "../server/migrate";
import { appRouter } from "../server/routers";

let migrationsPromise: Promise<void> | undefined;

function ensureMigrations(): Promise<void> {
  migrationsPromise ??= runStartupMigrations();
  return migrationsPromise;
}

export default async function handler(req: any, res: any) {
  console.log(`[tRPC] ${req.method} ${req.url}`);

  // 1. Handle health check
  if (req.url.includes("test-health")) {
    return res.status(200).json({ status: "ok", message: "tRPC Node Handler is alive" });
  }

  // 2. Run migrations (idempotent)
  try {
    await ensureMigrations();
  } catch (err) {
    console.error("[tRPC] Migration error:", err);
  }

  // 3. Handle tRPC request
  // Vercel rewrites /api/trpc/:path* to /api/trpc?__trpc_path=:path*
  // The nodeHTTPRequestHandler expects the path to be relative to the endpoint
  
  return nodeHTTPRequestHandler({
    req,
    res,
    router: appRouter,
    createContext: (opts) => createContext(opts as any),
    path: req.query.__trpc_path || "",
    onError({ error, path }) {
      console.error(`[tRPC Error] ${path ?? "unknown"}:`, error);
    },
  });
}
