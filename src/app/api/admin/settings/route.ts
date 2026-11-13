import { z } from "zod";
import { db, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { getRules } from "@/lib/rules";
import { isValidTime, toMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

const Body = z.object({
  slotMinutes: z.coerce.number().int().refine((n) => [15, 30, 60].includes(n), "Slot 15, 30, atau 60 menit"),
  maxDurationMinutes: z.coerce.number().int().min(15).max(480),
  minPeople: z.coerce.number().int().min(1).max(50),
  maxAdvanceDays: z.coerce.number().int().min(0).max(60),
  maxActivePerUser: z.coerce.number().int().min(1).max(20),
  checkinGraceMinutes: z.coerce.number().int().min(5).max(120),
  checkinEarlyMinutes: z.coerce.number().int().min(0).max(60),
  hours: z.record(
    z.string(),
    z.object({ open: z.string().nullable(), close: z.string().nullable() }),
  ),
});

export const GET = route(async () => {
  await requireSession("STAFF");
  return json(await getRules());
});

export const PUT = route(async (req) => {
  await requireSession("STAFF");
  const { hours, ...rest } = Body.parse(await req.json());
  for (const [d, h] of Object.entries(hours)) {
    const dow = Number(d);
    if (!(dow >= 0 && dow <= 6)) throw new HttpError(400, "Hari tidak valid.");
    if ((h.open || h.close) && (!isValidTime(h.open) || !isValidTime(h.close) || toMinutes(h.close!) <= toMinutes(h.open!)))
      throw new HttpError(400, "Jam buka/tutup tidak valid.");
  }
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.settings)
      .values({ id: 1, ...rest })
      .onConflictDoUpdate({ target: schema.settings.id, set: rest });
    for (const [d, h] of Object.entries(hours)) {
      const values = { dayOfWeek: Number(d), openTime: h.open || null, closeTime: h.close || null };
      await tx
        .insert(schema.openingHours)
        .values(values)
        .onConflictDoUpdate({ target: schema.openingHours.dayOfWeek, set: values });
    }
  });
  return json(await getRules());
});
