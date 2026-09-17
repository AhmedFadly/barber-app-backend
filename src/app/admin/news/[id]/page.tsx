import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";

import { ActionButton } from "../../_components/action-button";
import { Card, PageHeader } from "../../_components/ui";
import { dateTime } from "../../_lib/format";
import { deleteNews, pushNews, updateNews } from "../actions";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditNewsPage(props: PageProps<"/admin/news/[id]">) {
  const { id } = await props.params;
  const post = await db.newsPost.findUnique({ where: { id } });
  if (!post) notFound();
  const live = post.published && post.publishedAt <= new Date();

  return (
    <>
      <PageHeader eyebrow={post.tag} title={post.title} />
      <div className="split-wide">
        <Card>
          <NewsForm action={updateNews.bind(null, post.id)} post={post} />
        </Card>
        <div className="stack">
          <Card flush>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
            <div className="card-body">
              <p className="eyebrow">{post.tag}</p>
              <p className="card-title">{post.title}</p>
              <p className="small muted" style={{ marginTop: 6 }}>
                {post.summary}
              </p>
            </div>
          </Card>
          <Card title="Push notification" subtitle="Sends the title + summary to every customer who opted in">
            <div className="stack" style={{ gap: 12 }}>
              <p className="small">{post.pushedAt ? `Last sent ${dateTime(post.pushedAt)}` : <span className="muted">Not sent yet</span>}</p>
              {live ? (
                <ActionButton
                  action={pushNews.bind(null, post.id)}
                  label={post.pushedAt ? "Send again" : "Send push notification"}
                  pendingLabel="Sending…"
                  variant="primary"
                  confirm={`Send “${post.title}” to every opted-in customer?`}
                />
              ) : (
                <p className="small muted">Publish the post to enable notifications.</p>
              )}
            </div>
          </Card>
          <Card title="Danger zone">
            <ActionButton action={deleteNews.bind(null, post.id)} label="Delete post" variant="danger" confirm="Delete this post permanently?" />
          </Card>
        </div>
      </div>
    </>
  );
}
