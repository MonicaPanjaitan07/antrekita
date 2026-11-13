import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createBooking, sweepStatuses } from "@/lib/booking";
import { json, route } from "@/lib/http";
import { searchBookings } from "@/lib/queries";

export const dynamic = "force-dynamic";

// GET: mahasiswa -> booking miliknya. Petugas -> semua booking dengan filter.
export const GET = route(async (req) => {
  const s = await requireSession();
  await sweepStatuses();
  const sp = new URL(req.url).searchParams;
  return json(
    await searchBookings({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      roomId: sp.get("roomId") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      page: Number(sp.get("page") ?? 1),
      pageSize: Number(sp.get("pageSize") ?? 20),
      userId: s.role === "STUDENT" ? s.uid : undefined,
    }),
  );
});

const Body = z.object({
  roomId: z.string().min(1),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  participants: z.coerce.number().int(),
  purpose: z.string().trim().max(200),
  contactName: z.string().trim().max(80).optional(),
  contactNim: z.string().trim().max(20).optional(),
  source: z.enum(["WEB", "AI_CHAT"]).optional(),
});

export const POST = route(async (req) => {
  const s = await requireSession();
  const body = Body.parse(await req.json());
  const booking = await createBooking(body, s, body.source ?? "WEB");
  return json({ booking }, 201);
});
