import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const roleEnum = pgEnum("role", ["user", "admin"]);
const statusEnum = pgEnum("status", ["no_answer", "confirmed", "redirected"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agent sessions table for tracking agent logins
 */
export const agentSessions = pgTable("agent_sessions", {
  id: serial("id").primaryKey(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  isAdmin: integer("isAdmin").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
});

export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = typeof agentSessions.$inferInsert;

/**
 * Calls table for tracking all patient calls
 */
export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  patientName: varchar("patientName", { length: 255 }).notNull(),
  appointmentId: varchar("appointmentId", { length: 50 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 50 }).notNull(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  status: statusEnum("status").default("no_answer").notNull(),
  comment: text("comment"),
  numberOfTrials: integer("numberOfTrials").default(1).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Call = typeof calls.$inferSelect;
export type InsertCall = typeof calls.$inferInsert;

export const ADMIN_NAMES = ["Chandan", "Esmail"];
