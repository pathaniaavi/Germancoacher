/** Small helpers for route handlers: consistent JSON responses + a typed error. */
import { NextResponse } from "next/server";
import { ZodError, z, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const json = <T>(data: T, status = 200) => NextResponse.json(data, { status });

export const errorResponse = (err: unknown) => {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", details: err.flatten() }, { status: 400 });
  }
  console.error("Unhandled route error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
};

/** Parse + validate a JSON request body, throwing HttpError(400) on failure. */
export async function parseBody<S extends ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "Validation failed", result.error.flatten());
  return result.data;
}
