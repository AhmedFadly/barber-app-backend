import { z } from "zod";

import { findSlots } from "@/lib/availability";
import { handler, json } from "@/lib/http";

const schema = z.object({
  branchId: z.string().min(1),
  serviceIds: z.string().min(1).transform((s) => s.split(",").filter(Boolean)),
  date: z.iso.date(),
  barberId: z.string().optional(),
  excludeAppointmentId: z.string().optional(),
});

export const GET = handler(async (req) => {
  const q = schema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return json(await findSlots(q));
});
