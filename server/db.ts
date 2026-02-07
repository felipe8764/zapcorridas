import { and, desc, eq, gte, lte, like, or, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  passengers, InsertPassenger,
  drivers, InsertDriver,
  verificationCodes,
  rides, InsertRide,
  notifications, InsertNotification,
  authSessions,
  admins, InsertAdmin,
  messageTemplates, InsertMessageTemplate,
} from "../drizzle/schema";
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

// ==================== Passengers ====================

export async function findPassengerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(passengers).where(eq(passengers.phone, phone)).limit(1);
  return result[0] ?? null;
}

export async function createPassenger(data: InsertPassenger) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(passengers).values(data);
  return { id: result[0].insertId };
}

export async function updatePassenger(id: number, data: Partial<InsertPassenger>) {
  const db = await getDb();
  if (!db) return;
  await db.update(passengers).set(data).where(eq(passengers.id, id));
}

export async function getPassengerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(passengers).where(eq(passengers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function listPassengers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(passengers).where(
      or(like(passengers.name, `%${search}%`), like(passengers.phone, `%${search}%`))
    ).orderBy(desc(passengers.createdAt));
  }
  return db.select().from(passengers).orderBy(desc(passengers.createdAt));
}

export async function countPassengers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(passengers);
  return result[0]?.count ?? 0;
}

// ==================== Drivers ====================

export async function findDriverByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
  return result[0] ?? null;
}

export async function createDriver(data: InsertDriver) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(drivers).values(data);
  return { id: result[0].insertId };
}

export async function updateDriver(id: number, data: Partial<InsertDriver>) {
  const db = await getDb();
  if (!db) return;
  await db.update(drivers).set(data).where(eq(drivers.id, id));
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function listDrivers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(drivers).where(
      or(like(drivers.name, `%${search}%`), like(drivers.phone, `%${search}%`), like(drivers.plate, `%${search}%`))
    ).orderBy(desc(drivers.createdAt));
  }
  return db.select().from(drivers).orderBy(desc(drivers.createdAt));
}

export async function countDrivers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(drivers);
  return result[0]?.count ?? 0;
}

// ==================== Verification Codes ====================

export async function createVerificationCode(phone: string, code: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(verificationCodes).values({ phone, code, expiresAt });
}

export async function verifyCode(phone: string, code: string) {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const result = await db.select().from(verificationCodes)
    .where(and(
      eq(verificationCodes.phone, phone),
      eq(verificationCodes.code, code),
      eq(verificationCodes.used, false),
      gte(verificationCodes.expiresAt, now)
    ))
    .limit(1);
  if (result.length === 0) return false;
  await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, result[0].id));
  return true;
}

// ==================== Auth Sessions ====================

export async function createAuthSession(token: string, userType: "passenger" | "driver", userId: number, phone: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(authSessions).values({ token, userType, userId, phone });
}

export async function getAuthSession(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(authSessions).where(eq(authSessions.token, token)).limit(1);
  return result[0] ?? null;
}

export async function deleteAuthSession(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(eq(authSessions.token, token));
}

// ==================== Rides ====================

export async function createRide(data: InsertRide) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(rides).values(data);
  return { id: result[0].insertId };
}

export async function getRideById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rides).where(eq(rides.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateRide(id: number, data: Partial<InsertRide>) {
  const db = await getDb();
  if (!db) return;
  await db.update(rides).set(data).where(eq(rides.id, id));
}

export async function getActiveRideForPassenger(passengerId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rides)
    .where(and(
      eq(rides.passengerId, passengerId),
      or(eq(rides.status, "waiting"), eq(rides.status, "accepted"), eq(rides.status, "in_progress"))
    ))
    .orderBy(desc(rides.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function getActiveRideForDriver(driverId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rides)
    .where(and(
      eq(rides.driverId, driverId),
      or(eq(rides.status, "accepted"), eq(rides.status, "in_progress"))
    ))
    .orderBy(desc(rides.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function getPassengerRideHistory(passengerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rides)
    .where(eq(rides.passengerId, passengerId))
    .orderBy(desc(rides.createdAt));
}

export async function getDriverRideHistory(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rides)
    .where(eq(rides.driverId, driverId))
    .orderBy(desc(rides.createdAt));
}

export async function listAllRides(filters?: { status?: string; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(rides.status, filters.status as any));
  if (filters?.startDate) conditions.push(gte(rides.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(rides.createdAt, filters.endDate));
  if (conditions.length > 0) {
    return db.select().from(rides).where(and(...conditions)).orderBy(desc(rides.createdAt));
  }
  return db.select().from(rides).orderBy(desc(rides.createdAt));
}

export async function countRides() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(rides);
  return result[0]?.count ?? 0;
}

export async function countRidesByStatus() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ status: rides.status, count: count() }).from(rides).groupBy(rides.status);
}

export async function countRidesToday() {
  const db = await getDb();
  if (!db) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await db.select({ count: count() }).from(rides).where(gte(rides.createdAt, today));
  return result[0]?.count ?? 0;
}

// ==================== Notifications ====================

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(notifications).values(data);
  return { id: result[0].insertId };
}

export async function updateNotification(id: number, data: Partial<InsertNotification>) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set(data).where(eq(notifications.id, id));
}

export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.id, id));
}

export async function listNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).orderBy(desc(notifications.createdAt));
}

export async function getActiveNotifications(target: "passengers" | "drivers") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(and(
      eq(notifications.isActive, true),
      or(eq(notifications.target, "all"), eq(notifications.target, target))
    ))
    .orderBy(desc(notifications.createdAt));
}


// Admin functions
export async function findAdminByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(admins).where(eq(admins.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAdmin(data: InsertAdmin) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(admins).values(data);
  return result;
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listAdmins(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(admins)
      .where(or(
        like(admins.name, `%${search}%`),
        like(admins.phone, `%${search}%`),
        like(admins.email, `%${search}%`)
      ))
      .orderBy(desc(admins.createdAt));
  }
  return db.select().from(admins).orderBy(desc(admins.createdAt));
}

export async function updateAdmin(id: number, data: Partial<InsertAdmin>) {
  const db = await getDb();
  if (!db) return;
  await db.update(admins).set(data).where(eq(admins.id, id));
}

// Message template functions
export async function listMessageTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messageTemplates).orderBy(desc(messageTemplates.updatedAt));
}

export async function getMessageTemplate(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(messageTemplates).where(eq(messageTemplates.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMessageTemplate(id: number, data: Partial<InsertMessageTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(messageTemplates).set(data).where(eq(messageTemplates.id, id));
}

export async function createMessageTemplate(data: InsertMessageTemplate) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(messageTemplates).values(data);
  return result;
}


