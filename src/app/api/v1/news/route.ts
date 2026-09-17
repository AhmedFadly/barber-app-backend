import { db } from "@/lib/db";
import { handler, json } from "@/lib/http";

export const GET = handler(async () => {
  const posts = await db.newsPost.findMany({
    where: { published: true, publishedAt: { lte: new Date() } },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 30,
    select: { id: true, title: true, summary: true, imageUrl: true, tag: true, pinned: true, publishedAt: true },
  });
  return json({ posts });
});
