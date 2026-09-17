import type { Customer } from "@prisma/client";

import { getSettings } from "./db";
import { nextTier } from "./loyalty";

export async function serializeCustomer(c: Customer) {
  const settings = await getSettings();
  return {
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    birthday: c.birthday?.toISOString().slice(0, 10) ?? null,
    tier: c.tier,
    pointsBalance: c.pointsBalance,
    lifetimePoints: c.lifetimePoints,
    creditFils: c.creditFils,
    referralCode: c.referralCode,
    marketingOptIn: c.marketingOptIn,
    favouriteBarberId: c.favouriteBarberId,
    nextTier: nextTier(c.lifetimePoints, settings),
    memberSince: c.createdAt.toISOString(),
  };
}
