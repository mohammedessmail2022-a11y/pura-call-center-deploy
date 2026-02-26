import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Run idempotent migrations on startup (e.g. add new columns if missing).
 * Safe to run every time the server starts.
 */
export async function runStartupMigrations(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`ALTER TABLE calls ADD COLUMN IF NOT EXISTS "callCategory" text`
    );
    await db.execute(
      sql`ALTER TABLE calls ADD COLUMN IF NOT EXISTS "callSubCategory" text`
    );
    await db.execute(
      sql`ALTER TYPE status ADD VALUE IF NOT EXISTS 'other'`
    );
  } catch (err) {
    console.warn("[Database] Startup migration warning:", err);
  }
}
