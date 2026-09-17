import { db } from "./db";

type PushMessage = { title: string; body: string; data?: Record<string, unknown> };

/** Sends an Expo push notification to every device of the given customers (or everyone when omitted). */
export async function sendPush(message: PushMessage, customerIds?: string[]) {
  const tokens = await db.pushToken.findMany({
    where: customerIds ? { customerId: { in: customerIds } } : { customer: { marketingOptIn: true } },
    select: { token: true },
  });
  if (!tokens.length) return { sent: 0 };

  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((t) => ({ to: t.token, sound: "default", ...message }));
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    }).catch((err) => {
      console.error("push failed", err);
      return null;
    });
    if (!res?.ok) continue;
    const { data } = (await res.json()) as { data: { status: string; details?: { error?: string } }[] };
    // Forget tokens for uninstalled apps.
    const dead = batch.filter((_, idx) => data[idx]?.details?.error === "DeviceNotRegistered").map((m) => m.to);
    if (dead.length) await db.pushToken.deleteMany({ where: { token: { in: dead } } });
    sent += data.filter((d) => d.status === "ok").length;
  }
  return { sent };
}
