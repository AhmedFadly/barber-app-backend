import type { Metadata } from "next";

import { Card, PageHeader } from "../../_components/ui";
import { createBranch } from "../actions";
import { BranchForm } from "../branch-form";

export const metadata: Metadata = { title: "New branch" };

export default function NewBranchPage() {
  return (
    <>
      <PageHeader eyebrow="Branches" title="New branch" />
      <Card>
        <BranchForm action={createBranch} />
      </Card>
    </>
  );
}
