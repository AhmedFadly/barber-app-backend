import { z } from "zod";

import { signToken, verifyPassword } from "@/lib/auth";
import { serializeCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { ApiError, body, handler, json } from "@/lib/http";

const schema = z.object({ email: z.string().transform((e) => e.toLowerCase().trim()), password: z.string() });

export const POST = handler(async (req) => {
  const { email, password } = await body(req, schema);
  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer || !(await verifyPassword(password, customer.passwordHash))) throw new ApiError(401, "Incorrect email or password", "bad_credentials");
  return json({ token: await signToken(customer.id), customer: await serializeCustomer(customer) });
});
