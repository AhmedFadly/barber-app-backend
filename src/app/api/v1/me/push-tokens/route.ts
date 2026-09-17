import { z } from "zod";

import { requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, handler, json } from "@/lib/http";

const schema = z.object({ token: z.string().min(10).max(200), platform: z.enum(["ios", "android", "web"]) });

export const POST = handler(async (req) => {
  const customer = await requireCustomer(req);
  const { token, platform } = await body(req, schema);
  await db.pushToken.upsert({ where: { token }, update: { customerId: customer.id, platform }, create: { token, platform, customerId: customer.id } });
  return json({ ok: true });
});

export const DELETE = handler(async (req) => {
  await requireCustomer(req);
  const { token } = await body(req, schema.pick({ token: true }));
  await db.pushToken.deleteMany({ where: { token } });
  return json({ ok: true });
});
