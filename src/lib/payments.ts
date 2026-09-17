import Stripe from "stripe";

import { db } from "./db";
import { ApiError } from "./http";

const stripeKey = process.env.STRIPE_SECRET_KEY;
export const stripe = stripeKey ? new Stripe(stripeKey) : null;
export const paymentsMode = stripe ? "stripe" : "demo";

const publicUrl = () => process.env.PUBLIC_URL ?? "http://localhost:4800";

/**
 * Starts payment for a Payment row. Stripe mode returns a hosted Checkout URL the app opens in an
 * auth browser session; demo mode returns no URL and the app confirms via /payments/:id/demo-confirm.
 */
export async function startCheckout(paymentId: string, opts: { description: string; customerEmail: string; appReturnUrl?: string }) {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (!stripe) return { paymentId, mode: "demo" as const, checkoutUrl: null, amountFils: payment.amountFils };

  const app = opts.appReturnUrl && isAllowedAppReturnUrl(opts.appReturnUrl) ? `&app=${encodeURIComponent(opts.appReturnUrl)}` : "";
  const returnUrl = `${publicUrl()}/api/v1/payments/return?payment=${payment.id}${app}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    line_items: [
      { quantity: 1, price_data: { currency: "aed", unit_amount: payment.amountFils, product_data: { name: opts.description } } },
    ],
    metadata: { paymentId: payment.id },
    success_url: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}&cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
  await db.payment.update({ where: { id: payment.id }, data: { providerRef: session.id } });
  return { paymentId, mode: "stripe" as const, checkoutUrl: session.url, amountFils: payment.amountFils };
}

/** Where Stripe may bounce the customer back to: the app's own scheme, Expo Go, or a local web build. */
export function isAllowedAppReturnUrl(url: string) {
  const scheme = process.env.APP_SCHEME ?? "regent";
  return url.startsWith(`${scheme}://`) || /^exps?:\/\//.test(url) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
}

/** Confirms a Stripe Checkout session server-side (used by the return URL and the webhook). */
export async function verifyStripeSession(sessionId: string) {
  if (!stripe) throw new ApiError(400, "Stripe is not configured");
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return { paid: session.payment_status === "paid", paymentId: session.metadata?.paymentId ?? null };
}
