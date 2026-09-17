import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";

import { ActionButton } from "../_components/action-button";
import { Badge, ButtonLink, Card, Empty, PageHeader, TableWrap } from "../_components/ui";
import { dateTime } from "../_lib/format";
import { pushNews } from "./actions";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const posts = await db.newsPost.findMany({ orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }] });
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow="Shown on the app home screen" title="News">
        <ButtonLink href="/admin/news/new">New post</ButtonLink>
      </PageHeader>
      <Card flush>
        {posts.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Post</th>
                <th>Tag</th>
                <th>Status</th>
                <th>Published</th>
                <th>Push</th>
                <th className="actions" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className={p.published ? undefined : "dim"}>
                  <td>
                    <div className="person">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="news-thumb" />
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/admin/news/${p.id}`} className="link cell-title">
                          {p.title}
                        </Link>
                        <div className="cell-sub" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.summary}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="nowrap">{p.tag}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      {!p.published ? <Badge>Draft</Badge> : p.publishedAt > now ? <Badge tone="amber">Scheduled</Badge> : <Badge tone="green">Live</Badge>}
                      {p.pinned && <Badge tone="gold">Pinned</Badge>}
                    </div>
                  </td>
                  <td className="nowrap">{dateTime(p.publishedAt)}</td>
                  <td className="nowrap">{p.pushedAt ? <span className="small">Sent {dateTime(p.pushedAt)}</span> : <span className="muted small">Not sent</span>}</td>
                  <td className="actions">
                    {p.published && p.publishedAt <= now && (
                      <ActionButton
                        action={pushNews.bind(null, p.id)}
                        label={p.pushedAt ? "Push again" : "Send push"}
                        pendingLabel="Sending…"
                        confirm={`Send “${p.title}” as a push notification to every opted-in customer?`}
                      />
                    )}
                    <ButtonLink href={`/admin/news/${p.id}`} variant="ghost">
                      Edit
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <Empty>No posts yet.</Empty>
        )}
      </Card>
    </>
  );
}
