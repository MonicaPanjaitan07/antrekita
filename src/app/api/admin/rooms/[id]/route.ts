import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { pgErrorCode, RoomBody } from "@/lib/validators";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireSession("STAFF");
  const { id } = await params;
  const data = RoomBody.partial().parse(await req.json());
  try {
    const [room] = await db.update(schema.rooms).set(data).where(eq(schema.rooms.id, id)).returning();
    if (!room) throw new HttpError(404, "Ruangan tidak ditemukan.");
    return json({ room });
  } catch (e) {
    if (pgErrorCode(e) === "23505") throw new HttpError(409, "Nama ruangan atau kode check-in sudah dipakai.");
    throw e;
  }
});
