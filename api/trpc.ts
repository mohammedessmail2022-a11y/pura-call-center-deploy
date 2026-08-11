export default async function handler(req: any, res: any) {
  if (req.url.includes("test-health")) {
    return res.status(200).json({ status: "ok", message: "tRPC Node Handler is alive (early check)" });
  }

  try {
    console.log("[tRPC] Importing node-http...");
    const { nodeHTTPRequestHandler } = await import("@trpc/server/adapters/node-http");
    
    console.log("[tRPC] Importing context...");
    const { createContext } = await import("../server/_core/context");
    
    console.log("[tRPC] Importing migrate...");
    const { runStartupMigrations } = await import("../server/migrate");
    
    console.log("[tRPC] Importing routers...");
    const { appRouter } = await import("../server/routers");

    console.log(`[tRPC] Handling request: ${req.method} ${req.url}`);

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
  } catch (err) {
    console.error("[tRPC] Critical import error:", err);
    return res.status(500).json({ error: "Critical Import Error", details: String(err) });
  }
}
