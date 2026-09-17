import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

export function json(data: unknown, init?: number | ResponseInit) {
  return Response.json(data, typeof init === "number" ? { status: init } : init);
}

/** Wraps a route handler: converts ApiError / ZodError into JSON error responses. */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return json({ error: err.message, code: err.code }, err.status);
      if (err instanceof ZodError) {
        const issue = err.issues[0];
        const field = issue?.path.join(".");
        return json({ error: field ? `${field}: ${issue.message}` : "Invalid request", code: "validation" }, 422);
      }
      console.error(err);
      return json({ error: "Something went wrong", code: "server" }, 500);
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => {
    throw new ApiError(400, "Invalid JSON body");
  });
  return schema.parse(raw);
}
