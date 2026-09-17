import type { Prisma } from "@prisma/client";

import { randomCode } from "./auth";
import { PAYMENT_HOLD_MIN, findSlots, resolveServices } from "./availability";
import { db, getSettings } from "./db";
import { ApiError } from "./http";
import { addCredit, awardVisitPoints } from "./loyalty";
import { sendPush } from "./push";
import { formatLocal, localDateKey, localToUtc } from "./time";

export const appointmentInclude = {
  branch: { select: { id: true, name: true, area: true, address: true, phone: true, latitude: true, longitude: true } },
  barber: { select: { id: true, name: true, title: true, photoUrl: true } },
  items: { select: { serviceId: true, name: true, priceFils: true, durationMin: true } },
  payments: { where: { state: "SUCCEEDED" as const }, select: { amountFils: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export async function serializeAppointment(a: AppointmentWithRelations) {
  const settings = await getSettings();
  const paidFils = a.payments.reduce((s, p) => s + p.amountFils, 0);
  const cutoff = a.startsAt.getTime() - settings.cancellationHours * 3_600_000;
  const upcoming = a.startsAt.getTime() > Date.now();
  const open = a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT";
  return {
    id: a.id,
    reference: a.reference,
    status: a.status,
    paymentStatus: a.paymentStatus,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    branch: a.branch,
    barber: a.barber,
    items: a.items,
    notes: a.notes,
    subtotalFils: a.subtotalFils,
    depositFils: a.depositFils,
    creditUsedFils: a.creditUsedFils,
    paidFils,
    balanceDueFils: Math.max(0, a.subtotalFils - a.creditUsedFils - paidFils),
    canCancel: open && upcoming,
    canReschedule: a.status === "CONFIRMED" && upcoming && Date.now() < cutoff,
    lateCancellation: open && upcoming && Date.now() >= cutoff,
    cancellationHours: settings.cancellationHours,
    holdExpiresAt: a.status === "PENDING_PAYMENT" ? new Date(a.createdAt.getTime() + PAYMENT_HOLD_MIN * 60_000).toISOString() : null,
  };
}

/** Barbers free at the requested start, best candidate first. */
async function candidateBarbers(opts: {
  branchId: string;
  serviceIds: string[];
  startsAt: Date;
  barberId: string | null;
  excludeAppointmentId?: string;
}) {
  const date = localDateKey(opts.startsAt);
  const { slots, durationMin } = await findSlots({ ...opts, date });
  const slot = slots.find((s) => s.startsAt === opts.startsAt.toISOString());
  if (!slot) throw slotTaken();
  let barberIds = slot.barberIds;
  if (!opts.barberId && barberIds.length > 1) {
    // "Any barber": spread the load — whoever has the fewest bookings that day goes first.
    const counts = await db.appointment.groupBy({
      by: ["barberId"],
      where: { barberId: { in: barberIds }, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] }, startsAt: { gte: localToUtc(date, 0), lt: localToUtc(date, 24 * 60) } },
      _count: true,
    });
    const load = (id: string) => counts.find((c) => c.barberId === id)?._count ?? 0;
    barberIds = [...barberIds].sort((a, b) => load(a) - load(b));
  }
  return { barberIds, durationMin, date };
}

const slotTaken = () => new ApiError(409, "Sorry, that time was just taken. Please pick another slot.", "slot_taken");

/**
 * Runs `book` for each candidate barber under that barber's lock, re-checking the slot inside the lock.
 * With "any barber", losing a race for one barber falls through to the next free one.
 */
async function withFreeBarber<T>(
  candidates: string[],
  check: { branchId: string; serviceIds: string[]; startsAt: Date; date: string; excludeAppointmentId?: string },
  book: (tx: Prisma.TransactionClient, barberId: string) => Promise<T>,
): Promise<T> {
  for (const barberId of candidates) {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${barberId}))`;
      const { slots } = await findSlots({ ...check, barberId });
      if (!slots.some((s) => s.startsAt === check.startsAt.toISOString())) return null;
      return { value: await book(tx, barberId) };
    });
    if (result) return result.value;
  }
  throw slotTaken();
}

export async function createAppointment(input: {
  customerId: string;
  branchId: string;
  serviceIds: string[];
  barberId: string | null;
  startsAt: Date;
  notes?: string;
  useCredit: boolean;
}) {
  const settings = await getSettings();
  const services = await resolveServices(input.serviceIds);
  const { barberIds, durationMin, date } = await candidateBarbers(input);

  const subtotalFils = services.reduce((s, x) => s + x.priceFils, 0);
  const depositFils = Math.round((subtotalFils * settings.depositPercent) / 100);

  return withFreeBarber(barberIds, { ...input, date }, async (tx, barberId) => {
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId } });
    const creditUsedFils = input.useCredit ? Math.min(customer.creditFils, subtotalFils) : 0;
    const dueNowFils = Math.max(0, depositFils - creditUsedFils);

    const appt = await tx.appointment.create({
      data: {
        reference: `RG-${randomCode(6)}`,
        customerId: customer.id,
        branchId: input.branchId,
        barberId,
        startsAt: input.startsAt,
        endsAt: new Date(input.startsAt.getTime() + durationMin * 60_000),
        status: dueNowFils > 0 ? "PENDING_PAYMENT" : "CONFIRMED",
        paymentStatus: dueNowFils > 0 ? "UNPAID" : creditUsedFils >= subtotalFils ? "PAID" : "DEPOSIT_PAID",
        subtotalFils,
        depositFils,
        creditUsedFils,
        notes: input.notes || null,
        items: { create: services.map((s) => ({ serviceId: s.id, name: s.name, priceFils: s.priceFils, durationMin: s.durationMin })) },
      },
    });
    if (creditUsedFils > 0) await addCredit(tx, customer.id, -creditUsedFils, `Booking ${appt.reference}`, `spend:${appt.id}`);
    const payment =
      dueNowFils > 0
        ? await tx.payment.create({ data: { purpose: "DEPOSIT", provider: process.env.STRIPE_SECRET_KEY ? "stripe" : "demo", amountFils: dueNowFils, appointmentId: appt.id } })
        : null;
    return { appointmentId: appt.id, reference: appt.reference, payment };
  });
}

/** Idempotently applies a successful payment: confirms the booking or activates the gift card. */
export async function markPaymentSucceeded(paymentId: string) {
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.state === "SUCCEEDED") return null;
    await tx.payment.update({ where: { id: payment.id }, data: { state: "SUCCEEDED" } });

    if (payment.purpose === "DEPOSIT" && payment.appointmentId) {
      const appt = await tx.appointment.findUniqueOrThrow({ where: { id: payment.appointmentId } });
      if (appt.status === "CANCELLED") {
        // Paid after the hold expired and it was released — keep the money as wallet credit.
        await addCredit(tx, appt.customerId, payment.amountFils, `Refund ${appt.reference} (expired hold)`, `late-pay:${payment.id}`);
        return null;
      }
      await tx.appointment.update({ where: { id: appt.id }, data: { status: "CONFIRMED", paymentStatus: "DEPOSIT_PAID" } });
      return { customerId: appt.customerId, appointmentId: appt.id };
    }
    if (payment.purpose === "GIFT_CARD" && payment.giftCardId) {
      await tx.giftCard.update({ where: { id: payment.giftCardId }, data: { active: true } });
    }
    return null;
  });
  if (result) {
    const appt = await db.appointment.findUniqueOrThrow({ where: { id: result.appointmentId }, include: { branch: true } });
    await sendPush(
      { title: "Booking confirmed ✂️", body: `See you ${formatLocal(appt.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} at ${appt.branch.name}.`, data: { appointmentId: appt.id } },
      [result.customerId],
    );
  }
}

/**
 * Cancels a booking. Anything prepaid (wallet credit + card deposit) goes back to the wallet,
 * except the deposit on a late cancellation (inside the policy window), which is forfeited.
 */
export async function cancelAppointment(appointmentId: string, opts: { byShop?: boolean } = {}) {
  const settings = await getSettings();
  return db.$transaction(async (tx) => {
    const appt = await tx.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { payments: { where: { state: "SUCCEEDED" } } } });
    if (appt.status !== "CONFIRMED" && appt.status !== "PENDING_PAYMENT") throw new ApiError(409, "This booking can no longer be cancelled");
    const late = !opts.byShop && Date.now() >= appt.startsAt.getTime() - settings.cancellationHours * 3_600_000;
    const prepaid = appt.creditUsedFils + appt.payments.reduce((s, p) => s + p.amountFils, 0);
    const forfeit = late ? Math.min(prepaid, appt.depositFils) : 0;
    const refund = prepaid - forfeit;
    if (refund > 0) await addCredit(tx, appt.customerId, refund, `Refund ${appt.reference}`, `refund:${appt.id}`);
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), paymentStatus: refund > 0 ? "REFUNDED" : appt.paymentStatus },
    });
    return { refundedFils: refund, forfeitedFils: forfeit };
  });
}

export async function rescheduleAppointment(appointmentId: string, customerId: string, startsAt: Date, barberId: string | null) {
  const settings = await getSettings();
  const appt = await db.appointment.findFirst({ where: { id: appointmentId, customerId }, include: { items: true } });
  if (!appt) throw new ApiError(404, "Booking not found");
  if (appt.status !== "CONFIRMED") throw new ApiError(409, "Only confirmed bookings can be rescheduled");
  if (Date.now() >= appt.startsAt.getTime() - settings.cancellationHours * 3_600_000)
    throw new ApiError(409, `Bookings can only be moved more than ${settings.cancellationHours} hours in advance`);

  const serviceIds = appt.items.map((i) => i.serviceId);
  const check = { branchId: appt.branchId, serviceIds, startsAt, excludeAppointmentId: appt.id };
  const { barberIds, durationMin, date } = await candidateBarbers({ ...check, barberId });
  await withFreeBarber(barberIds, { ...check, date }, (tx, pickedBarberId) =>
    tx.appointment.update({
      where: { id: appt.id },
      data: { startsAt, endsAt: new Date(startsAt.getTime() + durationMin * 60_000), barberId: pickedBarberId, reminderSentAt: null },
    }),
  );
}

export async function completeAppointment(appointmentId: string) {
  const settings = await getSettings();
  return db.$transaction(async (tx) => {
    const appt = await tx.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
    if (appt.status === "COMPLETED") return 0;
    await tx.appointment.update({ where: { id: appt.id }, data: { status: "COMPLETED", paymentStatus: "PAID", completedAt: new Date() } });
    return awardVisitPoints(tx, appt.id, settings);
  });
}

/** Releases unpaid holds that timed out, returning any wallet credit they had reserved. */
export async function expireStaleHolds(holdMinutes: number) {
  const stale = await db.appointment.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(Date.now() - holdMinutes * 60_000) } },
    select: { id: true },
  });
  for (const a of stale) await cancelAppointment(a.id, { byShop: true });
  return stale.length;
}
