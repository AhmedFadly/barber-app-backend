import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatAed } from "@/lib/money";

import { ActionForm } from "../_components/action-form";
import { Badge, ButtonLink, Card, Empty, Field, PageHeader, TableWrap, Thumb } from "../_components/ui";
import { createCategory } from "./actions";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const categories = await db.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { services: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { barbers: true } } } } },
  });
  const count = categories.reduce((s, c) => s + c.services.length, 0);

  return (
    <>
      <PageHeader eyebrow={`${count} services · ${categories.length} categories`} title="Services">
        <ButtonLink href="/admin/services/new">New service</ButtonLink>
      </PageHeader>

      <div className="stack">
        {categories.map((cat) => (
          <Card key={cat.id} title={cat.name} subtitle={`${cat.services.length} service${cat.services.length === 1 ? "" : "s"}`} flush>
            {cat.services.length ? (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th className="num">Duration</th>
                    <th className="num">Price</th>
                    <th className="num">Barbers</th>
                    <th>Status</th>
                    <th className="actions" />
                  </tr>
                </thead>
                <tbody>
                  {cat.services.map((s) => (
                    <tr key={s.id} className={s.active ? undefined : "dim"}>
                      <td>
                        <div className="person">
                          <Thumb src={s.imageUrl} alt="" size={44} />
                          <div>
                            <Link href={`/admin/services/${s.id}`} className="link cell-title">
                              {s.name}
                            </Link>
                            <div className="cell-sub" style={{ maxWidth: 440, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{s.durationMin} min</td>
                      <td className="num">{formatAed(s.priceFils)}</td>
                      <td className="num">{s._count.barbers}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          {s.active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>}
                          {s.popular && <Badge tone="gold">Popular</Badge>}
                        </div>
                      </td>
                      <td className="actions">
                        <ButtonLink href={`/admin/services/${s.id}`} variant="ghost">
                          Edit
                        </ButtonLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <Empty>No services in this category yet.</Empty>
            )}
          </Card>
        ))}

        <Card title="New category" subtitle="Categories group services in the app menu">
          <ActionForm action={createCategory} submitLabel="Add category" resetOnSuccess>
            <div className="form-grid">
              <Field label="Name">
                <input type="text" name="name" required placeholder="Kids" />
              </Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
