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
  if (req.url.includes("test-health")) {
    return res.status(200).json({ status: "ok", message: "tRPC Node Handler is alive (server.ts)" });
  }

  try {
    await ensureMigrations();
  } catch (err) {
    console.error("[tRPC] Migration error:", err);
  }

  return nodeHTTPRequestHandler({
    req,
    res,
    router: appRouter,
    createContext: (opts) => createContext(opts as any),
    path: (req.query.__trpc_path || req.url.split('?')[0].replace('/api/server', '')).replace(/^\//, ''),
    onError({ error, path }) {
      console.error(`[tRPC Error] ${path ?? "unknown"}:`, error);
    },
  });
}
