import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createFetchContext } from "../server/_core/context";
import { runStartupMigrations } from "../server/migrate";
import { appRouter } from "../server/routers";
// Trigger deployment after linking repo

let migrationsPromise: Promise<void> | undefined;

function ensureMigrations(): Promise<void> {
  migrationsPromise ??= runStartupMigrations();
  return migrationsPromise;
}

async function handleRequest(request: Request): Promise<Response> {
  console.log(`[tRPC Handler] Received request: ${request.method} ${request.url}`);
  
  if (request.url.includes("test-health")) {
    return new Response(JSON.stringify({ status: "ok", message: "tRPC Handler is alive" }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    console.log("[tRPC Handler] Ensuring migrations...");
    await ensureMigrations();
    console.log("[tRPC Handler] Migrations ensured.");
  } catch (err) {
    console.error("[tRPC Handler] Migration failed:", err);
  }

  const url = new URL(request.url);
  const rewrittenPath = url.searchParams.get("__trpc_path");

  if (rewrittenPath !== null) {
    url.pathname = rewrittenPath
      ? `/api/trpc/${rewrittenPath}`
      : "/api/trpc";
    url.searchParams.delete("__trpc_path");
    request = new Request(url, request);
  }

  console.log(`[tRPC Handler] Routing to tRPC: ${url.pathname}`);
  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext: createFetchContext,
      onError({ error, path }) {
        console.error(`[tRPC Error] ${path ?? "unknown"}:`, error);
      },
    });
    console.log(`[tRPC Handler] Response status: ${response.status}`);
    return response;
  } catch (err) {
    console.error("[tRPC Handler] fetchRequestHandler crashed:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export default handleRequest;
