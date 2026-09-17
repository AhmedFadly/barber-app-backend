import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";

import { Card, Empty, PageHeader, Thumb } from "../../_components/ui";
import { updateService } from "../actions";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage(props: PageProps<"/admin/services/[id]">) {
  const { id } = await props.params;
  const [service, categories] = await Promise.all([
    db.service.findUnique({ where: { id }, include: { barbers: { include: { barber: { select: { id: true, name: true, photoUrl: true, branch: { select: { name: true } } } } } } } }),
    db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!service) notFound();

  return (
    <>
      <PageHeader eyebrow="Edit service" title={service.name} />
      <div className="split-wide">
        <Card>
          <ServiceForm action={updateService.bind(null, service.id)} categories={categories} service={service} />
        </Card>
        <div className="stack">
          <Card flush>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={service.imageUrl} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          </Card>
          <Card title="Offered by" subtitle="Assign services on each barber's page">
            {service.barbers.length ? (
              <div className="stack" style={{ gap: 12 }}>
                {service.barbers.map(({ barber }) => (
                  <Link key={barber.id} href={`/admin/barbers/${barber.id}`} className="person">
                    <Thumb src={barber.photoUrl} alt="" size={34} round />
                    <div>
                      <div className="cell-title">{barber.name}</div>
                      <div className="cell-sub">{barber.branch.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>No barbers offer this yet.</Empty>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
