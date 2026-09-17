import type { Metadata } from "next";

import { db } from "@/lib/db";

import { Card, PageHeader } from "../../_components/ui";
import { createBarber } from "../actions";
import { BarberForm } from "../barber-form";

export const metadata: Metadata = { title: "New barber" };

export default async function NewBarberPage() {
  const [branches, categories] = await Promise.all([
    db.branch.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { services: { orderBy: { sortOrder: "asc" } } } }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Barbers" title="New barber" />
      <Card>
        <BarberForm action={createBarber} branches={branches} categories={categories} />
      </Card>
    </>
  );
}
