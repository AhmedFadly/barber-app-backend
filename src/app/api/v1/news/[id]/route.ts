import { db } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/http";

export const GET = handler(async (_req, ctx: RouteContext<"/api/v1/news/[id]">) => {
  const { id } = await ctx.params;
  const post = await db.newsPost.findFirst({ where: { id, published: true } });
  if (!post) throw new ApiError(404, "Post not found");
  return json({ post });
});
