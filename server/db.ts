import { eq, and, sql } from "drizzle-orm";
import { InsertCall, Call, agentSessions, calls, InsertAgentSession } from "../drizzle/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _initialized = false;

async function initializeTables(db: ReturnType<typeof drizzle>) {
  if (_initialized) return;
  try {
    await db.execute(sql`
      DO $$ BEGIN CREATE TYPE role AS ENUM ('user', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await db.execute(sql`
      DO $$ BEGIN CREATE TYPE status AS ENUM ('no_answer', 'confirmed', 'redirected', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await db.execute(sql`
      DO $$ BEGIN CREATE TYPE call_category AS ENUM ('Patient_is_not_available', 'Doctor_Unavailable', 'Pass_Issue', 'Tech_Issue', 'Under_age_booking', 'Cisco_Call'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await db.execute(sql`
      DO $$ BEGIN CREATE TYPE patient_not_available_subcategory AS ENUM ('Switched_off', 'Salamtk_appt_not_interested', 'Patient_too_old', 'Does_Not_Have_UAE_Pass', 'Refuse_to_download_the_app', 'Will_go_to_inperson', 'Bedridden_patient', 'Patient_change_mind', 'Patient_joined_late', 'Got_an_earlier_booking', 'Dependent_booking'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await db.execute(sql`
      DO $$ BEGIN CREATE TYPE doctor_unavailable_subcategory AS ENUM ('Doctor_busy_with_inperson', 'Doctor_not_responding', 'Doctor_on_off_leave'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        "openId" VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        "loginMethod" VARCHAR(64),
        role role NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id SERIAL PRIMARY KEY,
        "agentName" VARCHAR(255) NOT NULL,
        "sessionId" VARCHAR(64) NOT NULL UNIQUE,
        "isAdmin" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "lastActiveAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        "patientName" VARCHAR(255) NOT NULL,
        "appointmentId" VARCHAR(50) NOT NULL,
        "appointmentTime" VARCHAR(50) NOT NULL,
        "agentName" VARCHAR(255) NOT NULL,
        status status NOT NULL DEFAULT 'no_answer',
        comment TEXT,
        "callCategory" VARCHAR(100),
        "callSubCategory" VARCHAR(100),
        "numberOfTrials" INTEGER NOT NULL DEFAULT 1,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    _initialized = true;
    console.log("[Database] Tables initialized successfully");
  } catch (error) {
    console.error("[Database] Failed to initialize tables:", error);
  }
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined,
      });
      _db = drizzle(pool);
      await initializeTables(_db);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all calls, ordered by most recent first
 */
export async function getAllCalls() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(calls).orderBy((c) => c.createdAt) || [];
}

/**
 * Get a single call by ID
 */
export async function getCallById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(calls).where(eq(calls.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new call
 */
export async function createCall(data: InsertCall) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calls).values(data).returning();
  return result;
}

/**
 * Update a call
 */
export async function updateCallRecord(id: number, data: Partial<InsertCall>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(calls).set(data).where(eq(calls.id, id));
}

/**
 * Delete a call
 */
export async function deleteCallRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(calls).where(eq(calls.id, id));
}

/**
 * Create or update agent session
 */
export async function upsertAgentSession(data: InsertAgentSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(agentSessions).values(data).onConflictDoUpdate({
    target: agentSessions.sessionId,
    set: {
      lastActiveAt: new Date(),
    },
  });
}

/**
 * Get agent session by session ID
 */
export async function getAgentSession(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agentSessions).where(eq(agentSessions.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Find a duplicate call by patient name and appointment ID
 */
export async function findDuplicateCall(patientName: string, appointmentId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(calls)
    .where(
      and(
        eq(calls.patientName, patientName),
        eq(calls.appointmentId, appointmentId)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}


/**
 * Deactivate all calls (for Start a New Day)
 */
export async function deactivateAllCalls() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(calls).set({ isActive: 0 });
}

/**
 * Get only active calls
 */
export async function getActiveCalls() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(calls).where(eq(calls.isActive, 1)).orderBy((c) => c.createdAt) || [];
}
