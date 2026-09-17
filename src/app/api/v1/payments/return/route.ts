import { markPaymentSucceeded } from "@/lib/booking";
import { isAllowedAppReturnUrl, verifyStripeSession } from "@/lib/payments";

/** Stripe Checkout lands here, then bounces back into the app via its deep link. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("payment") ?? "";
  const sessionId = url.searchParams.get("session_id");
  let status = "cancelled";
  if (sessionId) {
    try {
      const { paid, paymentId: metaId } = await verifyStripeSession(sessionId);
      if (paid && metaId === paymentId) {
        await markPaymentSucceeded(paymentId);
        status = "success";
      }
    } catch (err) {
      console.error("stripe return verify failed", err);
      status = "pending";
    }
  }
  const app = url.searchParams.get("app");
  const target = app && isAllowedAppReturnUrl(app) ? app : `${process.env.APP_SCHEME ?? "regent"}://payment-complete`;
  const sep = target.includes("?") ? "&" : "?";
  return Response.redirect(`${target}${sep}payment=${encodeURIComponent(paymentId)}&status=${status}`, 302);
}
