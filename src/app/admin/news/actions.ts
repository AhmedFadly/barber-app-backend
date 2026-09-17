"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sendPush } from "@/lib/push";

import { checked, fail, fields, ok, toFormError, type FormState } from "../_lib/form";
import { fromLocalInput } from "../_lib/hours";

const newsSchema = z.object({
  title: z.string().trim().min(3).max(100),
  summary: z.string().trim().min(10, "Write a one-line summary").max(200),
  body: z.string().trim().min(10).max(5000),
  imageUrl: z.url("Enter a full image URL (https://…)"),
  tag: z.string().trim().min(2).max(24),
});

function newsData(fd: FormData) {
  const data = newsSchema.parse(fields(fd));
  return { ...data, pinned: checked(fd, "pinned"), published: checked(fd, "published"), publishedAt: fromLocalInput(fd.get("publishedAt")) ?? new Date() };
}

export async function createNews(fd: FormData): Promise<FormState> {
  await requireAdmin();
  let id: string;
  try {
    id = (await db.newsPost.create({ data: newsData(fd) })).id;
  } catch (err) {
    return toFormError(err);
  }
  revalidatePath("/admin/news");
  redirect(`/admin/news/${id}`);
}

export async function updateNews(id: string, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await db.newsPost.update({ where: { id }, data: newsData(fd) });
    revalidatePath("/admin/news", "layout");
    return ok("Post saved");
  } catch (err) {
    return toFormError(err);
  }
}

export async function pushNews(id: string): Promise<FormState> {
  await requireAdmin();
  const post = await db.newsPost.findUnique({ where: { id } });
  if (!post) return fail("Post not found");
  if (!post.published || post.publishedAt > new Date()) return fail("Publish the post before notifying customers");
  const { sent } = await sendPush({ title: post.title, body: post.summary, data: { newsId: post.id } });
  await db.newsPost.update({ where: { id }, data: { pushedAt: new Date() } });
  revalidatePath("/admin/news", "layout");
  return ok(`Sent to ${sent} device${sent === 1 ? "" : "s"}`);
}

export async function deleteNews(id: string): Promise<FormState> {
  await requireAdmin();
  await db.newsPost.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/news");
  redirect("/admin/news");
}
