import { z } from "zod";

import { hashPassword, randomCode, signToken } from "@/lib/auth";
import { serializeCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { ApiError, body, handler, json } from "@/lib/http";

const schema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.email().transform((e) => e.toLowerCase().trim()),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,16}$/, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  marketingOptIn: z.boolean().default(true),
});

export const POST = handler(async (req) => {
  const input = await body(req, schema);
  if (await db.customer.findUnique({ where: { email: input.email } })) throw new ApiError(409, "An account with this email already exists", "email_taken");
  const { password, ...rest } = input;
  const customer = await db.customer.create({
    data: { ...rest, passwordHash: await hashPassword(password), referralCode: `${input.firstName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "")}${randomCode(4)}` },
  });
  return json({ token: await signToken(customer.id), customer: await serializeCustomer(customer) }, 201);
});
