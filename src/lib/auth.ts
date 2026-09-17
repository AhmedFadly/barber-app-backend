import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import { db } from "./db";
import { ApiError } from "./http";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
const TOKEN_TTL = "90d";

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function signToken(customerId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(customerId).setIssuedAt().setExpirationTime(TOKEN_TTL).sign(secret);
}

export async function requireCustomer(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Please sign in", "unauthenticated");
  try {
    const { payload } = await jwtVerify(token, secret);
    const customer = payload.sub ? await db.customer.findUnique({ where: { id: payload.sub } }) : null;
    if (!customer) throw new Error("gone");
    return customer;
  } catch {
    throw new ApiError(401, "Your session has expired, please sign in again", "unauthenticated");
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomCode(len: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
