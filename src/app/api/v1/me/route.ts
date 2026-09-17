import { z } from "zod";

import { hashPassword, requireCustomer } from "@/lib/auth";
import { serializeCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { body, handler, json } from "@/lib/http";

export const GET = handler(async (req) => {
  const customer = await requireCustomer(req);
  return json({ customer: await serializeCustomer(customer) });
});

const patchSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,16}$/, "Enter a valid phone number").optional(),
  birthday: z.iso.date().nullable().optional(),
  marketingOptIn: z.boolean().optional(),
  favouriteBarberId: z.string().nullable().optional(),
});

export const PATCH = handler(async (req) => {
  const customer = await requireCustomer(req);
  const { birthday, ...rest } = await body(req, patchSchema);
  const updated = await db.customer.update({
    where: { id: customer.id },
    data: { ...rest, ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}) },
  });
  return json({ customer: await serializeCustomer(updated) });
});

/** Account deletion (required by the App Store). Anonymises the profile; booking history stays for the shop's records. */
export const DELETE = handler(async (req) => {
  const customer = await requireCustomer(req);
  await db.$transaction([
    db.pushToken.deleteMany({ where: { customerId: customer.id } }),
    db.appointment.updateMany({ where: { customerId: customer.id, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] }, startsAt: { gt: new Date() } }, data: { status: "CANCELLED", cancelledAt: new Date() } }),
    db.customer.update({
      where: { id: customer.id },
      data: {
        email: `deleted-${customer.id}@deleted.invalid`,
        firstName: "Deleted",
        lastName: "Customer",
        phone: "",
        birthday: null,
        marketingOptIn: false,
        passwordHash: await hashPassword(crypto.randomUUID()),
      },
    }),
  ]);
  return json({ ok: true });
});
