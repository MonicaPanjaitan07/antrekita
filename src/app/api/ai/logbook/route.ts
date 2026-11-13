import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { extractLogbook } from "@/lib/ai";
import { requireSession } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { isValidDate, todayWIB } from "@/lib/time";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function matchRoom(text: string | null, rooms: { id: string; name: string }[]) {
  if (!text) return null;
  const t = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const exact = rooms.find((r) => r.name.toLowerCase() === t);
  if (exact) return exact.id;
  const num = t.match(/(\d+)/)?.[1];
  if (num) {
    const byNum = rooms.find((r) => r.name.match(/(\d+)\s*$/)?.[1] === num);
    if (byNum) return byNum.id;
  }
  const partial = rooms.find((r) => t.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(t));
  return partial?.id ?? null;
}

// Petugas mengunggah foto halaman buku booking -> AI mengekstrak baris untuk direview.
// Foto TIDAK disimpan; hanya hasil ekstraksi yang dikembalikan.
export const POST = route(async (req) => {
  await requireSession("STAFF");
  const form = await req.formData();
  const file = form.get("image");
  const defaultDate = String(form.get("defaultDate") ?? "");
  if (!(file instanceof File)) throw new HttpError(400, "Unggah foto halaman buku.");
  if (!TYPES.includes(file.type)) throw new HttpError(400, "Format foto harus JPG, PNG, WEBP, atau HEIC.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Ukuran foto maksimal 4 MB.");

  const rooms = await db
    .select({ id: schema.rooms.id, name: schema.rooms.name })
    .from(schema.rooms)
    .where(eq(schema.rooms.isActive, true));
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const rows = await extractLogbook({
    base64,
    mimeType: file.type,
    roomNames: rooms.map((r) => r.name),
    defaultYear: Number(todayWIB().slice(0, 4)),
    defaultDate: isValidDate(defaultDate) ? defaultDate : undefined,
  });

  return json({
    rows: rows.map((r) => ({
      ...r,
      date: r.date ?? (isValidDate(defaultDate) ? defaultDate : null),
      roomId: matchRoom(r.room, rooms),
    })),
  });
});
