import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { runStartupMigrations } from "../server/migrate";

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: (opts) => createContext(opts as any),
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Express Bridge is alive" });
});

// Run migrations (idempotent)
let migrationsStarted = false;
app.use(async (req, res, next) => {
  if (!migrationsStarted) {
    migrationsStarted = true;
    runStartupMigrations().catch(err => console.error("Migration error:", err));
  }
  next();
});

export default app;
