import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agent sessions table for tracking agent logins
 */
export const agentSessions = mysqlTable("agent_sessions", {
  id: int("id").autoincrement().primaryKey(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  isAdmin: int("isAdmin").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = typeof agentSessions.$inferInsert;

/**
 * Calls table for tracking all patient calls
 */
export const calls = mysqlTable("calls", {
  id: int("id").autoincrement().primaryKey(),
  patientName: varchar("patientName", { length: 255 }).notNull(),
  appointmentId: varchar("appointmentId", { length: 50 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 50 }).notNull(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["no_answer", "confirmed", "redirected"]).default("no_answer").notNull(),
  comment: text("comment"),
  numberOfTrials: int("numberOfTrials").default(1).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Call = typeof calls.$inferSelect;
export type InsertCall = typeof calls.$inferInsert;

export const ADMIN_NAMES = ["Chandan", "Esmail"];
