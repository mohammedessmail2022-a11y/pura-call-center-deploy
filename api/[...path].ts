import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { runStartupMigrations } from "../server/migrate";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", message: "Express Bridge is alive" });
});

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: (opts) => createContext(opts as any),
  })
);

let migrationsStarted = false;
app.use(async (_req, _res, next) => {
  if (!migrationsStarted) {
    migrationsStarted = true;
    runStartupMigrations().catch((err) => console.error("[Database] Migration error:", err));
  }
  next();
});

export default app;
