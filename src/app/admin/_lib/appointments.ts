import type { Prisma } from "@prisma/client";

export const adminAppointmentInclude = {
  customer: { select: { id: true, firstName: true, lastName: true, phone: true, tier: true } },
  branch: { select: { id: true, name: true } },
  barber: { select: { id: true, name: true } },
  items: { select: { name: true } },
  payments: { where: { state: "SUCCEEDED" as const }, select: { amountFils: true } },
} satisfies Prisma.AppointmentInclude;

export type AdminAppointment = Prisma.AppointmentGetPayload<{ include: typeof adminAppointmentInclude }>;

export function balanceDue(a: AdminAppointment) {
  if (a.status === "COMPLETED" || a.status === "CANCELLED") return 0;
  const paid = a.payments.reduce((s, p) => s + p.amountFils, 0);
  return Math.max(0, a.subtotalFils - a.creditUsedFils - paid);
}
