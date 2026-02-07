import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock Z-API
vi.mock("./zapi", () => ({
  sendVerificationCode: vi.fn().mockResolvedValue(true),
  notifyNewRide: vi.fn().mockResolvedValue(true),
  notifyDriverAccepted: vi.fn().mockResolvedValue(true),
  notifyPassengerAccepted: vi.fn().mockResolvedValue(true),
  notifyCancellation: vi.fn().mockResolvedValue(true),
  notifyRideStarted: vi.fn().mockResolvedValue(true),
  notifyRideCompleted: vi.fn().mockResolvedValue(true),
  sendGroupMessage: vi.fn().mockResolvedValue(true),
  sendTextMessage: vi.fn().mockResolvedValue(true),
  sendLocation: vi.fn().mockResolvedValue(true),
}));

// Mock db functions
vi.mock("./db", () => ({
  findPassengerByPhone: vi.fn().mockResolvedValue(null),
  findDriverByPhone: vi.fn().mockResolvedValue(null),
  createPassenger: vi.fn().mockResolvedValue({ id: 1 }),
  createDriver: vi.fn().mockResolvedValue({ id: 1 }),
  getPassengerById: vi.fn().mockResolvedValue({ id: 1, name: "Test Passenger", phone: "5511999999999", totalRides: 0, isBlocked: false }),
  getDriverById: vi.fn().mockResolvedValue({ id: 1, name: "Test Driver", phone: "5511888888888", carModel: "Gol", carColor: "Branco", plate: "ABC-1234", totalRides: 5, isAvailable: true, isBlocked: false, expiresAt: new Date(Date.now() + 86400000) }),
  createVerificationCode: vi.fn().mockResolvedValue(undefined),
  verifyCode: vi.fn().mockResolvedValue(true),
  createAuthSession: vi.fn().mockResolvedValue(undefined),
  getAuthSession: vi.fn().mockResolvedValue(null),
  deleteAuthSession: vi.fn().mockResolvedValue(undefined),
  createRide: vi.fn().mockResolvedValue({ id: 1 }),
  getRideById: vi.fn().mockResolvedValue({ id: 1, passengerId: 1, driverId: null, status: "waiting", originAddress: "Rua A", destinationAddress: "Rua B", originLat: "-23.5", originLng: "-46.6", destinationLat: "-23.6", destinationLng: "-46.7", distanceKm: "5.0", durationMinutes: 15 }),
  updateRide: vi.fn().mockResolvedValue(undefined),
  getActiveRideForPassenger: vi.fn().mockResolvedValue(null),
  getActiveRideForDriver: vi.fn().mockResolvedValue(null),
  getPassengerRideHistory: vi.fn().mockResolvedValue([]),
  getDriverRideHistory: vi.fn().mockResolvedValue([]),
  listAllRides: vi.fn().mockResolvedValue([]),
  countPassengers: vi.fn().mockResolvedValue(10),
  countDrivers: vi.fn().mockResolvedValue(5),
  countRides: vi.fn().mockResolvedValue(100),
  countRidesToday: vi.fn().mockResolvedValue(3),
  countRidesByStatus: vi.fn().mockResolvedValue([{ status: "completed", count: 80 }]),
  listPassengers: vi.fn().mockResolvedValue([]),
  listDrivers: vi.fn().mockResolvedValue([]),
  updatePassenger: vi.fn().mockResolvedValue(undefined),
  updateDriver: vi.fn().mockResolvedValue(undefined),
  listNotifications: vi.fn().mockResolvedValue([]),
  getActiveNotifications: vi.fn().mockResolvedValue([]),
  createNotification: vi.fn().mockResolvedValue({ id: 1 }),
  updateNotification: vi.fn().mockResolvedValue(undefined),
  deleteNotification: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

type CookieCall = { name: string; value?: string; options: Record<string, unknown> };

function createPublicContext(): { ctx: TrpcContext; setCookies: CookieCall[]; clearedCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: { origin: "https://test.com" } } as any,
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => { setCookies.push({ name, value, options }); },
      clearCookie: (name: string, options: Record<string, unknown>) => { clearedCookies.push({ name, options }); },
    } as any,
  };
  return { ctx, setCookies, clearedCookies };
}

function createAdminContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: {
      id: 1, openId: "admin-id", email: "admin@test.com", name: "Admin",
      loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  };
  return { ctx };
}

describe("WhatsApp Auth", () => {
  it("checkPhone returns 'new' for unknown phone", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsappAuth.checkPhone({ phone: "5511999999999" });
    expect(result.status).toBe("new");
    expect(result.userType).toBe("passenger");
  });

  it("sendCode creates verification code and sends via WhatsApp", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsappAuth.sendCode({ phone: "5511999999999" });
    expect(result.sent).toBe(true);
  });

  it("verifyCode creates session and sets cookie for new passenger", async () => {
    const { ctx, setCookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsappAuth.verifyCode({ phone: "5511999999999", code: "123456", name: "João" });
    expect(result.userType).toBe("passenger");
    expect(result.userId).toBe(1);
    expect(result.token).toBeTruthy();
    expect(setCookies.length).toBe(1);
    expect(setCookies[0].name).toBe("zc_session");
  });

  it("logout clears session cookie", async () => {
    const { ctx, clearedCookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.whatsappAuth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
    expect(clearedCookies[0].name).toBe("zc_session");
  });
});

describe("Passenger", () => {
  it("requestRide creates a new ride", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.passenger.requestRide({
      passengerId: 1,
      originAddress: "Rua A, 100",
      originLat: -23.5505,
      originLng: -46.6333,
      destinationAddress: "Rua B, 200",
      destinationLat: -23.5605,
      destinationLng: -46.6433,
      distanceKm: "5.0",
      durationMinutes: 15,
    });
    expect(result.rideId).toBe(1);
  });

  it("getActiveRide returns null when no active ride", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.passenger.getActiveRide({ passengerId: 1 });
    expect(result).toBeNull();
  });

  it("getRideHistory returns empty array", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.passenger.getRideHistory({ passengerId: 1 });
    expect(result).toEqual([]);
  });
});

describe("Driver", () => {
  it("getActiveRide returns null when no active ride", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.driver.getActiveRide({ driverId: 1 });
    expect(result).toBeNull();
  });

  it("getRideHistory returns empty array", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.driver.getRideHistory({ driverId: 1 });
    expect(result).toEqual([]);
  });

  it("acceptRide succeeds for valid ride", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.driver.acceptRide({ rideId: 1, driverId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Admin", () => {
  it("getStats returns dashboard statistics", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.getStats();
    expect(result.totalPassengers).toBe(10);
    expect(result.totalDrivers).toBe(5);
    expect(result.totalRides).toBe(100);
    expect(result.ridesToday).toBe(3);
  });

  it("listPassengers returns array", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.listPassengers();
    expect(Array.isArray(result)).toBe(true);
  });

  it("listDrivers returns array", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.listDrivers();
    expect(Array.isArray(result)).toBe(true);
  });

  it("createNotification succeeds", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.createNotification({ title: "Aviso", message: "Teste", target: "all" });
    expect(result.id).toBe(1);
  });
});
