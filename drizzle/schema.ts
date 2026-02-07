import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean as mysqlBoolean, decimal } from "drizzle-orm/mysql-core";

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
 * Passengers table - users who request rides
 */
export const passengers = mysqlTable("passengers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  totalRides: int("totalRides").default(0).notNull(),
  isBlocked: mysqlBoolean("isBlocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Passenger = typeof passengers.$inferSelect;
export type InsertPassenger = typeof passengers.$inferInsert;

/**
 * Drivers table - users who accept rides (registered by admin only)
 */
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  carModel: varchar("carModel", { length: 100 }).notNull(),
  carColor: varchar("carColor", { length: 50 }).notNull(),
  plate: varchar("plate", { length: 20 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  isBlocked: mysqlBoolean("isBlocked").default(false).notNull(),
  isAvailable: mysqlBoolean("isAvailable").default(true).notNull(),
  totalRides: int("totalRides").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

/**
 * Verification codes for WhatsApp-based authentication
 */
export const verificationCodes = mysqlTable("verification_codes", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: mysqlBoolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;

/**
 * Rides table - core business entity
 */
export const rides = mysqlTable("rides", {
  id: int("id").autoincrement().primaryKey(),
  passengerId: int("passengerId").notNull(),
  driverId: int("driverId"),
  originAddress: text("originAddress").notNull(),
  originLat: decimal("originLat", { precision: 10, scale: 7 }).notNull(),
  originLng: decimal("originLng", { precision: 10, scale: 7 }).notNull(),
  destinationAddress: text("destinationAddress").notNull(),
  destinationLat: decimal("destinationLat", { precision: 10, scale: 7 }).notNull(),
  destinationLng: decimal("destinationLng", { precision: 10, scale: 7 }).notNull(),
  distanceKm: decimal("distanceKm", { precision: 8, scale: 2 }).notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  status: mysqlEnum("status", [
    "waiting",
    "accepted",
    "in_progress",
    "completed",
    "cancelled_by_passenger",
    "cancelled_by_driver",
  ]).default("waiting").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ride = typeof rides.$inferSelect;
export type InsertRide = typeof rides.$inferInsert;

/**
 * Admin notifications - announcements shown in-app
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  target: mysqlEnum("target", ["all", "passengers", "drivers"]).default("all").notNull(),
  isActive: mysqlBoolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Auth sessions for WhatsApp-based login (separate from Manus OAuth)
 */
export const authSessions = mysqlTable("auth_sessions", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  userType: mysqlEnum("userType", ["passenger", "driver"]).notNull(),
  userId: int("userId").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthSession = typeof authSessions.$inferSelect;