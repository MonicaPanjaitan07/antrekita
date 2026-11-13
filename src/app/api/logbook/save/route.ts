import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { generateCode, isOverlapError } from "@/lib/booking";
import { HttpError, json, route } from "@/lib/http";
import { isValidDate, isValidTime, toMinutes, wib } from "@/lib/time";

const Row = z.object({
  date: z.string(),
  start: z.string(),
  end: z.string(),
  roomId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  nim: z.string().trim().max(20).optional().nullable(),
  participants: z.coerce.number().int().min(1).max(100),
  purpose: z.string().trim().max(200).optional().nullable(),
});

const Body = z.object({
  label: z.string().trim().max(100).optional(),
  rows: z.array(z.unknown()).min(1).max(100),
});

// Menyimpan hasil digitalisasi buku (setelah direview petugas).
// Baris yang sudah lewat -> COMPLETED (arsip). Baris mendatang -> BOOKED (ikut aturan anti bentrok).
export const POST = route(async (req) => {
  const s = await requireSession("STAFF");
  const body = Body.parse(await req.json());

  const roomIds = new Set((await db.select({ id: schema.rooms.id }).from(schema.rooms)).map((r) => r.id));
  const [imp] = await db
    .insert(schema.logbookImports)
    .values({ uploadedById: s.uid, label: body.label || null, rowCount: 0 })
    .returning();

  const results: { index: number; ok: boolean; code?: string; error?: string }[] = [];
  const now = new Date();

  for (let i = 0; i < body.rows.length; i++) {
    const parsed = Row.safeParse(body.rows[i]);
    if (!parsed.success) {
      results.push({ index: i, ok: false, error: "Data baris belum lengkap (nama, ruang, peserta)." });
      continue;
    }
    const r = parsed.data;
    if (!isValidDate(r.date) || !isValidTime(r.start) || !isValidTime(r.end) || toMinutes(r.end) <= toMinutes(r.start)) {
      results.push({ index: i, ok: false, error: "Tanggal/jam tidak valid." });
      continue;
    }
    if (!roomIds.has(r.roomId)) {
      results.push({ index: i, ok: false, error: "Ruangan tidak dikenal." });
      continue;
    }
    const startAt = wib(r.date, r.start);
    const endAt = wib(r.date, r.end);
    const past = endAt <= now;
    try {
      const [b] = await db
        .insert(schema.bookings)
        .values({
          code: generateCode(),
          roomId: r.roomId,
          createdById: s.uid,
          contactName: r.name,
          contactNim: r.nim?.toUpperCase() || null,
          purpose: r.purpose || "Dari buku catatan manual",
          participants: r.participants,
          startAt,
          endAt,
          status: past ? "COMPLETED" : "BOOKED",
          source: "LOGBOOK",
          importId: imp.id,
          checkedInAt: past ? startAt : null,
        })
        .returning({ code: schema.bookings.code });
      results.push({ index: i, ok: true, code: b.code });
    } catch (e) {
      results.push({
        index: i,
        ok: false,
        error: isOverlapError(e) ? "Bentrok dengan booking lain yang masih aktif." : "Gagal menyimpan baris ini.",
      });
    }
  }

  const saved = results.filter((r) => r.ok).length;
  if (saved === 0) {
    await db.delete(schema.logbookImports).where(eq(schema.logbookImports.id, imp.id));
    throw new HttpError(400, "Tidak ada baris yang tersimpan.", { results });
  }
  await db.update(schema.logbookImports).set({ rowCount: saved }).where(eq(schema.logbookImports.id, imp.id));
  return json({ importId: imp.id, saved, results });
});
