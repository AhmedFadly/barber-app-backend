import type { Metadata } from "next";

import { db } from "@/lib/db";

import { Card, PageHeader } from "../../_components/ui";
import { createService } from "../actions";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage() {
  const categories = await db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader eyebrow="Services" title="New service" />
      <Card>
        <ServiceForm action={createService} categories={categories} />
      </Card>
    </>
  );
}
