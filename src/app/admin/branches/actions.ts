"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

import { WEEKDAYS } from "../_lib/format";
import { checked, fields, ok, slugify, toFormError, type FormState } from "../_lib/form";
import { parseWeek } from "../_lib/hours";

const branchSchema = z.object({
  name: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(200),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,20}$/, "Enter a valid phone number"),
  imageUrl: z.url("Enter a full image URL (https://…)"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

function branchData(fd: FormData) {
  const data = branchSchema.parse(fields(fd));
  const openingHours = parseWeek(fd, "hours", WEEKDAYS).map(({ weekday, start, end }) => ({ weekday, open: start, close: end }));
  return { ...data, openingHours, active: checked(fd, "active") };
}

export async function createBranch(fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const data = branchData(fd);
    await db.branch.create({ data: { ...data, slug: slugify(data.name) } });
  } catch (err) {
    return toFormError(err);
  }
  revalidatePath("/admin/branches");
  redirect("/admin/branches");
}

export async function updateBranch(id: string, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db.branch.update({ where: { id }, data: branchData(fd) });
    revalidatePath("/admin/branches", "layout");
    return ok("Branch saved");
  } catch (err) {
    return toFormError(err);
  }
}
