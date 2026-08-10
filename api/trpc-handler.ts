import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createFetchContext } from "../server/_core/context";
import { runStartupMigrations } from "../server/migrate";
import { appRouter } from "../server/routers";

let migrationsPromise: Promise<void> | undefined;

function ensureMigrations(): Promise<void> {
  migrationsPromise ??= runStartupMigrations();
  return migrationsPromise;
}

async function handleRequest(request: Request): Promise<Response> {
  await ensureMigrations();

  const url = new URL(request.url);
  const rewrittenPath = url.searchParams.get("__trpc_path");

  if (rewrittenPath !== null) {
    url.pathname = rewrittenPath
      ? `/api/trpc/${rewrittenPath}`
      : "/api/trpc";
    url.searchParams.delete("__trpc_path");
    request = new Request(url, request);
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: createFetchContext,
    onError({ error, path }) {
      console.error(`[tRPC] ${path ?? "unknown"}:`, error);
    },
  });
}

export default {
  fetch: handleRequest,
};
