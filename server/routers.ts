import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import * as zapi from "./zapi";
import { makeRequest, type DirectionsResult } from "./_core/map";
import { TRPCError } from "@trpc/server";

// ==================== WhatsApp Auth Router ====================
const whatsappAuthRouter = router({
  checkPhone: publicProcedure
    .input(z.object({ phone: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const { phone } = input;
      const admin = await db.findAdminByPhone(phone);
      if (admin) {
        if (admin.isBlocked) return { status: "blocked" as const, userType: "admin" as const };
        return { status: "exists" as const, userType: "admin" as const };
      }
      const driver = await db.findDriverByPhone(phone);
      if (driver) {
        if (driver.isBlocked) return { status: "blocked" as const, userType: "driver" as const };
        if (new Date(driver.expiresAt) < new Date()) return { status: "expired" as const, userType: "driver" as const };
        return { status: "exists" as const, userType: "driver" as const };
      }
      const passenger = await db.findPassengerByPhone(phone);
      if (passenger) {
        if (passenger.isBlocked) return { status: "blocked" as const, userType: "passenger" as const };
        return { status: "exists" as const, userType: "passenger" as const };
      }
      return { status: "new" as const, userType: "passenger" as const };
    }),

  sendCode: publicProcedure
    .input(z.object({ phone: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await db.createVerificationCode(input.phone, code);
      const sent = await zapi.sendVerificationCode(input.phone, code);
      return { sent };
    }),

  verifyCode: publicProcedure
    .input(z.object({ phone: z.string().min(10), code: z.string().length(6), name: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const valid = await db.verifyCode(input.phone, input.code);
      if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "Código inválido ou expirado" });
      let userType: "passenger" | "driver" | "admin" = "passenger";
      let userId: number;
      const admin = await db.findAdminByPhone(input.phone);
      if (admin) {
        if (admin.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "Conta bloqueada" });
        userType = "admin";
        userId = admin.id;
      } else {
        const driver = await db.findDriverByPhone(input.phone);
        if (driver) {
          if (driver.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "Conta bloqueada" });
          if (new Date(driver.expiresAt) < new Date()) throw new TRPCError({ code: "FORBIDDEN", message: "Conta vencida" });
          userType = "driver";
          userId = driver.id;
        } else {
          let passenger = await db.findPassengerByPhone(input.phone);
          if (!passenger) {
            if (!input.name) throw new TRPCError({ code: "BAD_REQUEST", message: "Nome é obrigatório para novo cadastro" });
            const result = await db.createPassenger({ phone: input.phone, name: input.name });
            userId = result.id;
          } else {
            if (passenger.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "Conta bloqueada" });
            userId = passenger.id;
          }
        }
      }
      const token = nanoid(64);
      await db.createAuthSession(token, userType, userId!, input.phone);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie("zc_session", token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
      return { userType, userId: userId!, token };
    }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = Object.fromEntries(cookieHeader.split(";").map(c => { const [k, ...v] = c.trim().split("="); return [k, v.join("=")]; }));
    const token = cookies["zc_session"];
    if (!token) return null;
    const session = await db.getAuthSession(token);
    if (!session) return null;
    if (session.userType === "admin") {
      const admin = await db.getAdminById(session.userId);
      if (!admin || admin.isBlocked) return null;
      return { userType: "admin" as const, userId: session.userId, phone: session.phone, name: admin.name, admin };
    } else if (session.userType === "driver") {
      const driver = await db.getDriverById(session.userId);
      if (!driver || driver.isBlocked || new Date(driver.expiresAt) < new Date()) return null;
      return { userType: "driver" as const, userId: session.userId, phone: session.phone, name: driver.name, driver };
    } else {
      const passenger = await db.getPassengerById(session.userId);
      if (!passenger || passenger.isBlocked) return null;
      return { userType: "passenger" as const, userId: session.userId, phone: session.phone, name: passenger.name, passenger };
    }
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.cookie;
    if (cookieHeader) {
      const cookies = Object.fromEntries(cookieHeader.split(";").map(c => { const [k, ...v] = c.trim().split("="); return [k, v.join("=")]; }));
      const token = cookies["zc_session"];
      if (token) await db.deleteAuthSession(token);
    }
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie("zc_session", { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
});

// ==================== Passenger Router ====================
const passengerRouter = router({
  requestRide: publicProcedure
    .input(z.object({
      passengerId: z.number(), originAddress: z.string(), originLat: z.number(), originLng: z.number(),
      destinationAddress: z.string(), destinationLat: z.number(), destinationLng: z.number(),
      distanceKm: z.string(), durationMinutes: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const activeRide = await db.getActiveRideForPassenger(input.passengerId);
      if (activeRide) throw new TRPCError({ code: "BAD_REQUEST", message: "Você já tem uma corrida ativa" });
      const ride = await db.createRide({
        passengerId: input.passengerId, originAddress: input.originAddress,
        originLat: String(input.originLat), originLng: String(input.originLng),
        destinationAddress: input.destinationAddress,
        destinationLat: String(input.destinationLat), destinationLng: String(input.destinationLng),
        distanceKm: input.distanceKm, durationMinutes: input.durationMinutes, status: "waiting",
      });
      const passenger = await db.getPassengerById(input.passengerId);
      if (passenger) {
        const origin = ctx.req?.headers?.origin || "";
        await zapi.notifyNewRide({
          passengerName: passenger.name, passengerTotalRides: passenger.totalRides,
          originAddress: input.originAddress, destinationAddress: input.destinationAddress,
          distanceKm: input.distanceKm, durationMinutes: input.durationMinutes,
          acceptUrl: `${origin}/aceitar/${ride.id}`,
        });
      }
      return { rideId: ride.id };
    }),

  getActiveRide: publicProcedure
    .input(z.object({ passengerId: z.number() }))
    .query(async ({ input }) => {
      const ride = await db.getActiveRideForPassenger(input.passengerId);
      if (!ride) return null;
      let driverInfo = null;
      if (ride.driverId) {
        const driver = await db.getDriverById(ride.driverId);
        if (driver) driverInfo = { name: driver.name, phone: driver.phone, carModel: driver.carModel, carColor: driver.carColor, plate: driver.plate };
      }
      return { ...ride, driverInfo };
    }),

  cancelRide: publicProcedure
    .input(z.object({ rideId: z.number(), passengerId: z.number() }))
    .mutation(async ({ input }) => {
      const ride = await db.getRideById(input.rideId);
      if (!ride) throw new TRPCError({ code: "NOT_FOUND", message: "Corrida não encontrada" });
      if (ride.passengerId !== input.passengerId) throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      if (ride.status !== "waiting" && ride.status !== "accepted") throw new TRPCError({ code: "BAD_REQUEST", message: "Corrida não pode ser cancelada" });
      await db.updateRide(input.rideId, { status: "cancelled_by_passenger", cancelledAt: new Date() });
      if (ride.driverId) {
        const driver = await db.getDriverById(ride.driverId);
        if (driver) { await db.updateDriver(driver.id, { isAvailable: true }); await zapi.notifyCancellation(driver.phone, "passenger", false); }
      }
      return { success: true };
    }),

  getRideHistory: publicProcedure
    .input(z.object({ passengerId: z.number() }))
    .query(async ({ input }) => {
      const ridesList = await db.getPassengerRideHistory(input.passengerId);
      return Promise.all(ridesList.map(async (ride) => {
        let driverInfo = null;
        if (ride.driverId) { const driver = await db.getDriverById(ride.driverId); if (driver) driverInfo = { name: driver.name, carModel: driver.carModel, carColor: driver.carColor, plate: driver.plate }; }
        return { ...ride, driverInfo };
      }));
    }),

  getNotifications: publicProcedure.query(async () => db.getActiveNotifications("passengers")),
});

// ==================== Driver Router ====================
const driverRouter = router({
  acceptRide: publicProcedure
    .input(z.object({ rideId: z.number(), driverId: z.number() }))
    .mutation(async ({ input }) => {
      const ride = await db.getRideById(input.rideId);
      if (!ride) throw new TRPCError({ code: "NOT_FOUND", message: "Corrida não encontrada" });
      if (ride.status !== "waiting") throw new TRPCError({ code: "BAD_REQUEST", message: "Corrida já foi aceita ou cancelada" });
      const driver = await db.getDriverById(input.driverId);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "Motorista não encontrado" });
      if (!driver.isAvailable) throw new TRPCError({ code: "BAD_REQUEST", message: "Você já está em uma corrida" });
      await db.updateRide(input.rideId, { driverId: input.driverId, status: "accepted", acceptedAt: new Date() });
      await db.updateDriver(input.driverId, { isAvailable: false });
      const passenger = await db.getPassengerById(ride.passengerId);
      if (passenger) {
        await zapi.notifyDriverAccepted({ driverPhone: driver.phone, passengerName: passenger.name, passengerPhone: passenger.phone, originAddress: ride.originAddress, destinationAddress: ride.destinationAddress, distanceKm: String(ride.distanceKm), durationMinutes: ride.durationMinutes, originLat: Number(ride.originLat), originLng: Number(ride.originLng) });
        await zapi.notifyPassengerAccepted({ passengerPhone: passenger.phone, driverName: driver.name, driverPhone: driver.phone, carModel: driver.carModel, carColor: driver.carColor, plate: driver.plate });
      }
      return { success: true };
    }),

  startRide: publicProcedure
    .input(z.object({ rideId: z.number(), driverId: z.number() }))
    .mutation(async ({ input }) => {
      const ride = await db.getRideById(input.rideId);
      if (!ride) throw new TRPCError({ code: "NOT_FOUND", message: "Corrida não encontrada" });
      if (ride.driverId !== input.driverId) throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      if (ride.status !== "accepted") throw new TRPCError({ code: "BAD_REQUEST", message: "Corrida não pode ser iniciada" });
      await db.updateRide(input.rideId, { status: "in_progress", startedAt: new Date() });
      const passenger = await db.getPassengerById(ride.passengerId);
      if (passenger) await zapi.notifyRideStarted(passenger.phone);
      return { success: true };
    }),

  completeRide: publicProcedure
    .input(z.object({ rideId: z.number(), driverId: z.number() }))
    .mutation(async ({ input }) => {
      const ride = await db.getRideById(input.rideId);
      if (!ride) throw new TRPCError({ code: "NOT_FOUND", message: "Corrida não encontrada" });
      if (ride.driverId !== input.driverId) throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      if (ride.status !== "in_progress") throw new TRPCError({ code: "BAD_REQUEST", message: "Corrida não está em andamento" });
      await db.updateRide(input.rideId, { status: "completed", completedAt: new Date() });
      await db.updateDriver(input.driverId, { isAvailable: true, totalRides: ((await db.getDriverById(input.driverId))?.totalRides ?? 0) + 1 });
      const passenger = await db.getPassengerById(ride.passengerId);
      if (passenger) { await db.updatePassenger(passenger.id, { totalRides: passenger.totalRides + 1 }); await zapi.notifyRideCompleted(passenger.phone); }
      return { success: true };
    }),

  cancelRide: publicProcedure
    .input(z.object({ rideId: z.number(), driverId: z.number() }))
    .mutation(async ({ input }) => {
      const ride = await db.getRideById(input.rideId);
      if (!ride) throw new TRPCError({ code: "NOT_FOUND", message: "Corrida não encontrada" });
      if (ride.driverId !== input.driverId) throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      await db.updateRide(input.rideId, { status: "cancelled_by_driver", cancelledAt: new Date() });
      await db.updateDriver(input.driverId, { isAvailable: true });
      const passenger = await db.getPassengerById(ride.passengerId);
      if (passenger) await zapi.notifyCancellation(passenger.phone, "driver", true);
      return { success: true };
    }),

  getActiveRide: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const ride = await db.getActiveRideForDriver(input.driverId);
      if (!ride) return null;
      const passenger = await db.getPassengerById(ride.passengerId);
      return { ...ride, passengerInfo: passenger ? { name: passenger.name, phone: passenger.phone } : null };
    }),

  getRideHistory: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const ridesList = await db.getDriverRideHistory(input.driverId);
      return Promise.all(ridesList.map(async (ride) => {
        const passenger = await db.getPassengerById(ride.passengerId);
        return { ...ride, passengerInfo: passenger ? { name: passenger.name } : null };
      }));
    }),

  getNotifications: publicProcedure.query(async () => db.getActiveNotifications("drivers")),
});

// ==================== Admin Router ====================
const adminRouter = router({
  getStats: protectedProcedure.query(async () => {
    const [totalPassengers, totalDrivers, totalRides, ridesToday, ridesByStatus] = await Promise.all([
      db.countPassengers(), db.countDrivers(), db.countRides(), db.countRidesToday(), db.countRidesByStatus(),
    ]);
    return { totalPassengers, totalDrivers, totalRides, ridesToday, ridesByStatus };
  }),

  listPassengers: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => db.listPassengers(input?.search)),

  updatePassenger: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), isBlocked: z.boolean().optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await db.updatePassenger(id, data); return { success: true }; }),

  listDrivers: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => db.listDrivers(input?.search)),

  createDriver: protectedProcedure
    .input(z.object({ phone: z.string().min(10), name: z.string().min(2), carModel: z.string().min(2), carColor: z.string().min(2), plate: z.string().min(2), expiresAt: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.findDriverByPhone(input.phone);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Motorista já cadastrado" });
      const result = await db.createDriver({ ...input, expiresAt: new Date(input.expiresAt) });
      return { id: result.id };
    }),

  updateDriver: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), carModel: z.string().optional(), carColor: z.string().optional(), plate: z.string().optional(), expiresAt: z.string().optional(), isBlocked: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const { id, expiresAt, ...rest } = input;
      const data: any = { ...rest };
      if (expiresAt) data.expiresAt = new Date(expiresAt);
      await db.updateDriver(id, data);
      return { success: true };
    }),

  listRides: protectedProcedure
    .input(z.object({ status: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const filters: any = {};
      if (input?.status) filters.status = input.status;
      if (input?.startDate) filters.startDate = new Date(input.startDate);
      if (input?.endDate) filters.endDate = new Date(input.endDate);
      const ridesList = await db.listAllRides(filters);
      return Promise.all(ridesList.map(async (ride) => {
        const passenger = await db.getPassengerById(ride.passengerId);
        const driver = ride.driverId ? await db.getDriverById(ride.driverId) : null;
        return { ...ride, passengerName: passenger?.name ?? "Desconhecido", passengerPhone: passenger?.phone ?? null, driverName: driver?.name ?? null, driverPhone: driver?.phone ?? null };
      }));
    }),

  getRideDetails: protectedProcedure
    .input(z.object({ rideId: z.number() }))
    .query(async ({ input }) => {
      const ride = await db.getRideById(input.rideId);
      if (!ride) throw new TRPCError({ code: "NOT_FOUND", message: "Corrida não encontrada" });
      const passenger = await db.getPassengerById(ride.passengerId);
      const driver = ride.driverId ? await db.getDriverById(ride.driverId) : null;
      return { ...ride, passenger, driver };
    }),

  listNotifications: protectedProcedure.query(async () => db.listNotifications()),

  createNotification: protectedProcedure
    .input(z.object({ title: z.string().min(1), message: z.string().min(1), target: z.enum(["all", "passengers", "drivers"]) }))
    .mutation(async ({ input }) => { const result = await db.createNotification(input); return { id: result.id }; }),

  updateNotification: protectedProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), message: z.string().optional(), target: z.enum(["all", "passengers", "drivers"]).optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateNotification(id, data); return { success: true }; }),

  deleteNotification: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => { await db.deleteNotification(input.id); return { success: true }; }),

  listTemplates: protectedProcedure.query(async () => db.listMessageTemplates()),

  updateTemplate: protectedProcedure
    .input(z.object({ id: z.number(), template: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateMessageTemplate(id, data);
      return { success: true };
    }),
});

// ==================== Maps Router ====================
const mapsRouter = router({
  getDirections: publicProcedure
    .input(z.object({ originLat: z.number(), originLng: z.number(), destLat: z.number(), destLng: z.number() }))
    .query(async ({ input }) => {
      const result = await makeRequest<DirectionsResult>("/maps/api/directions/json", {
        origin: `${input.originLat},${input.originLng}`, destination: `${input.destLat},${input.destLng}`, mode: "driving",
      });
      if (result.status !== "OK" || !result.routes[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível calcular a rota" });
      const leg = result.routes[0].legs[0];
      return { distanceText: leg.distance.text, distanceValue: leg.distance.value, durationText: leg.duration.text, durationValue: leg.duration.value, polyline: result.routes[0].overview_polyline.points };
    }),
});

// ==================== Ratings Router ====================
const ratingsRouter = router({
  createRating: protectedProcedure
    .input(z.object({ rideId: z.number(), driverId: z.number(), passengerId: z.number(), stars: z.number().min(1).max(5), comment: z.string().optional() }))
    .mutation(async ({ input }) => {
      const existing = await db.getRatingByRideId(input.rideId);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta corrida já foi avaliada" });
      await db.createRating(input);
      return { success: true };
    }),
  getRatingByRideId: publicProcedure
    .input(z.object({ rideId: z.number() }))
    .query(async ({ input }) => db.getRatingByRideId(input.rideId)),
  getDriverRatings: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => db.getDriverRatings(input.driverId)),
  getDriverAverageRating: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => db.getDriverAverageRating(input.driverId)),
  listAllRatings: protectedProcedure
    .input(z.object({ driverId: z.number().optional(), passengerId: z.number().optional() }).optional())
    .query(async ({ input }) => db.listAllRatings(input)),
  updateRating: protectedProcedure
    .input(z.object({ id: z.number(), stars: z.number().min(1).max(5).optional(), comment: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateRating(id, data);
      return { success: true };
    }),
  deleteRating: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteRating(input.id);
      return { success: true };
    }),
});

// ==================== Main Router ====================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  whatsappAuth: whatsappAuthRouter,
  passenger: passengerRouter,
  driver: driverRouter,
  admin: adminRouter,
  ratings: ratingsRouter,
  maps: mapsRouter,
});

export type AppRouter = typeof appRouter;
