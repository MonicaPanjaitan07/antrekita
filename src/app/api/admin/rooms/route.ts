import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { pgErrorCode, RoomBody } from "@/lib/validators";
import { HttpError, json, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireSession("STAFF");
  return json({ rooms: await db.select().from(schema.rooms).orderBy(asc(schema.rooms.name)) });
});

export const POST = route(async (req) => {
  await requireSession("STAFF");
  const data = RoomBody.parse(await req.json());
  try {
    const [room] = await db.insert(schema.rooms).values(data).returning();
    return json({ room }, 201);
  } catch (e) {
    if (pgErrorCode(e) === "23505")
      throw new HttpError(409, "Nama ruangan atau kode check-in sudah dipakai.");
    throw e;
  }
});
