import type { Metadata } from "next";

import { Card, PageHeader } from "../../_components/ui";
import { createNews } from "../actions";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "New post" };

export default function NewNewsPage() {
  return (
    <>
      <PageHeader eyebrow="News" title="New post" />
      <Card>
        <NewsForm action={createNews} />
      </Card>
    </>
  );
}
