"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

import { checked, fields, ok, slugify, toFormError, type FormState } from "../_lib/form";

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(60).optional(),
  categoryId: z.string().min(1, "Choose a category"),
  description: z.string().trim().min(10, "Write at least a sentence").max(600),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceAed: z.coerce.number().min(0).max(100_000),
  imageUrl: z.url("Enter a full image URL (https://…)"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

function serviceData(fd: FormData) {
  const { slug, priceAed, ...rest } = serviceSchema.parse(fields(fd));
  return {
    ...rest,
    slug: slugify(slug || rest.name),
    priceFils: Math.round(priceAed * 100),
    popular: checked(fd, "popular"),
    active: checked(fd, "active"),
  };
}

export async function createService(fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db.service.create({ data: serviceData(fd) });
  } catch (err) {
    return toFormError(err);
  }
  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function updateService(id: string, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db.service.update({ where: { id }, data: serviceData(fd) });
    revalidatePath("/admin/services", "layout");
    return ok("Service saved");
  } catch (err) {
    return toFormError(err);
  }
}

const categorySchema = z.object({ name: z.string().trim().min(2).max(40) });

export async function createCategory(fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const { name } = categorySchema.parse(fields(fd));
    const last = await db.serviceCategory.aggregate({ _max: { sortOrder: true } });
    await db.serviceCategory.create({ data: { name, slug: slugify(name), sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    revalidatePath("/admin/services", "layout");
    return ok(`Category “${name}” added`);
  } catch (err) {
    return toFormError(err);
  }
}
