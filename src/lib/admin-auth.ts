import { headers } from "next/headers";

/**
 * Server actions post to /admin/* so the proxy's Basic Auth already covers them;
 * this re-checks inside each action as defence in depth.
 */
export async function requireAdmin() {
  const expected = `Basic ${btoa(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`)}`;
  const actual = (await headers()).get("authorization");
  if (!process.env.ADMIN_PASSWORD || actual !== expected) throw new Error("Unauthorized");
}
