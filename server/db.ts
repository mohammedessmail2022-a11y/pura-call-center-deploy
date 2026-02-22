import { eq, and } from "drizzle-orm";
import { InsertCall, Call, agentSessions, calls, InsertAgentSession } from "../drizzle/schema";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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
  const result = await db.insert(calls).values(data);
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
  return await db.insert(agentSessions).values(data).onDuplicateKeyUpdate({
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
  const { eq } = await import("drizzle-orm");
  return await db.select().from(calls).where(eq(calls.isActive, 1)).orderBy((c) => c.createdAt) || [];
}
