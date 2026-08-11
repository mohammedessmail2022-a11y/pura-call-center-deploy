export default async function handler(req: any, res: any) {
  if (req.url.includes("test-health")) {
    return res.status(200).json({ status: "ok", message: "tRPC Node Handler is alive (early check)" });
  }

  // Only import these when needed to avoid startup crashes if possible
  const { nodeHTTPRequestHandler } = await import("@trpc/server/adapters/node-http");
  const { createContext } = await import("../server/_core/context");
  const { runStartupMigrations } = await import("../server/migrate");
  const { appRouter } = await import("../server/routers");

  console.log(`[tRPC] ${req.method} ${req.url}`);

  try {
    await runStartupMigrations();
  } catch (err) {
    console.error("[tRPC] Migration error:", err);
  }

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
