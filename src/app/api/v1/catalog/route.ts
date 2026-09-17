import { db, getSettings } from "@/lib/db";
import { handler, json } from "@/lib/http";
import { paymentsMode } from "@/lib/payments";

/** Everything the app needs to render the menu and booking flow, in one request. */
export const GET = handler(async () => {
  const [settings, categories, branches, barbers] = await Promise.all([
    getSettings(),
    db.serviceCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        services: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, slug: true, name: true, description: true, durationMin: true, priceFils: true, imageUrl: true, popular: true },
        },
      },
    }),
    db.branch.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true, area: true, address: true, phone: true, imageUrl: true, latitude: true, longitude: true, openingHours: true },
    }),
    db.barber.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, title: true, bio: true, photoUrl: true, rating: true, branchId: true, services: { select: { serviceId: true } } },
    }),
  ]);
  return json({
    categories: categories.filter((c) => c.services.length).map(({ id, slug, name, services }) => ({ id, slug, name, services })),
    branches,
    barbers: barbers.map(({ services, ...b }) => ({ ...b, serviceIds: services.map((s) => s.serviceId) })),
    policy: {
      depositPercent: settings.depositPercent,
      cancellationHours: settings.cancellationHours,
      bookingWindowDays: settings.bookingWindowDays,
      pointsPerAed: settings.pointsPerAed,
      redeemBlockPoints: settings.redeemBlockPoints,
      redeemBlockFils: settings.redeemBlockFils,
      goldThreshold: settings.goldThreshold,
      blackThreshold: settings.blackThreshold,
      paymentsMode,
    },
  });
});
