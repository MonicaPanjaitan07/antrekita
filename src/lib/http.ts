import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Bungkus route handler: ubah error menjadi respons JSON yang rapi. */
export function route<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: "Data yang dikirim tidak valid.", details: e.flatten() },
          { status: 400 },
        );
      }
      console.error("[api error]", e);
      return NextResponse.json({ error: "Terjadi kesalahan di server." }, { status: 500 });
    }
  };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
