import { ZodError, type ZodType } from "zod";

import { ApiError } from "@/lib/http";

export type FormState = { ok: boolean; message: string } | null;

export const ok = (message = "Saved"): FormState => ({ ok: true, message });
export const fail = (message: string): FormState => ({ ok: false, message });

/** Form fields as a plain object; unchecked checkboxes are simply absent. */
export function fields(fd: FormData) {
  return Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")));
}

export const checked = (fd: FormData, name: string) => fd.get(name) === "on";

/** Turns thrown validation / domain errors into a message for the form. */
export function toFormError(err: unknown): FormState {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join(".");
    return fail(field ? `${label(field)}: ${issue.message}` : "Please check the form");
  }
  if (err instanceof ApiError) return fail(err.message);
  if (typeof err === "object" && err && "code" in err && err.code === "P2002") return fail("That value is already in use — it must be unique");
  throw err;
}

function label(field: string) {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Rethrows Next's redirect / notFound control-flow errors so they aren't swallowed. */
export function isNextControlFlow(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err && typeof err.digest === "string" && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR)/.test(err.digest);
}
