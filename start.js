import { execSync } from "child_process";

// Run drizzle migrations at startup when DATABASE_URL is available
try {
  console.log("[Startup] Running drizzle-kit generate...");
  execSync("npx drizzle-kit generate", { stdio: "inherit" });
  console.log("[Startup] Running drizzle-kit migrate...");
  execSync("npx drizzle-kit migrate", { stdio: "inherit" });
  console.log("[Startup] Migrations complete!");
} catch (err) {
  console.error("[Startup] Migration error:", err.message);
}

// Start the main server
import("./dist/index.js");
