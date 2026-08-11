import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

export default function handler(req: any, res: any) {
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
