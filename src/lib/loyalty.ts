import type { Prisma, Settings, Tier } from "@prisma/client";

export function tierFor(lifetimePoints: number, s: Settings): Tier {
  if (lifetimePoints >= s.blackThreshold) return "BLACK";
  if (lifetimePoints >= s.goldThreshold) return "GOLD";
  return "SILVER";
}

export function nextTier(lifetimePoints: number, s: Settings) {
  if (lifetimePoints < s.goldThreshold) return { tier: "GOLD" as Tier, pointsNeeded: s.goldThreshold - lifetimePoints, threshold: s.goldThreshold };
  if (lifetimePoints < s.blackThreshold) return { tier: "BLACK" as Tier, pointsNeeded: s.blackThreshold - lifetimePoints, threshold: s.blackThreshold };
  return null;
}

/** Wallet credit movement. Idempotent on sourceKey. Returns false if already applied. */
export async function addCredit(tx: Prisma.TransactionClient, customerId: string, amountFils: number, reason: string, sourceKey: string) {
  if (amountFils === 0) return true;
  const existing = await tx.creditEntry.findUnique({ where: { sourceKey } });
  if (existing) return false;
  await tx.creditEntry.create({ data: { customerId, amountFils, reason, sourceKey } });
  await tx.customer.update({ where: { id: customerId }, data: { creditFils: { increment: amountFils } } });
  return true;
}

/** Awards visit points for a completed appointment. Idempotent per appointment. */
export async function awardVisitPoints(tx: Prisma.TransactionClient, appointmentId: string, settings: Settings) {
  const appt = await tx.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { customer: true } });
  const sourceKey = `visit:${appt.id}`;
  if (await tx.pointsEntry.findUnique({ where: { sourceKey } })) return 0;
  const points = Math.floor(appt.subtotalFils / 100) * settings.pointsPerAed;
  if (points <= 0) return 0;
  const lifetime = appt.customer.lifetimePoints + points;
  await tx.pointsEntry.create({ data: { customerId: appt.customerId, points, reason: `Visit ${appt.reference}`, sourceKey } });
  await tx.customer.update({
    where: { id: appt.customerId },
    data: { pointsBalance: { increment: points }, lifetimePoints: lifetime, tier: tierFor(lifetime, settings) },
  });
  return points;
}
