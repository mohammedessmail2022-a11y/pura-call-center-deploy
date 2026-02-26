#!/usr/bin/env node
/**
 * Render start script: runs db migration then starts the app.
 * Requires DATABASE_URL to be set in Render environment.
 */
import { spawnSync } from "node:child_process";

// Run drizzle-kit push to create/update tables (non-blocking)
if (process.env.DATABASE_URL) {
  const r = spawnSync("npx", ["drizzle-kit", "push"], {
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) {
    console.warn("[start] drizzle-kit push failed, continuing...");
  }
} else {
  console.warn("[start] DATABASE_URL not set - database features will not work");
}

// Start the app (blocks until server exits)
const server = spawnSync("node", ["dist/index.js"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});
process.exit(server.status ?? 1);
