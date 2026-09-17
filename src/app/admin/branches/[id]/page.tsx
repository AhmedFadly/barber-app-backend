import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";

import { Card, PageHeader } from "../../_components/ui";
import { updateBranch } from "../actions";
import { BranchForm } from "../branch-form";

export const metadata: Metadata = { title: "Edit branch" };

export default async function EditBranchPage(props: PageProps<"/admin/branches/[id]">) {
  const { id } = await props.params;
  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) notFound();
  return (
    <>
      <PageHeader eyebrow={branch.area} title={branch.name} />
      <Card>
        <BranchForm action={updateBranch.bind(null, branch.id)} branch={branch} />
      </Card>
    </>
  );
}
