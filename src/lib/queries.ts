import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { BookingStatus } from "@/db/schema";
import { toDTO } from "./booking";
import { addDays, isValidDate, wib } from "./time";

const { bookings, rooms } = schema;

export type SearchParams = {
  q?: string;
  status?: string;
  roomId?: string;
  from?: string;
  to?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
};

const STATUSES: BookingStatus[] = ["BOOKED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];

export async function searchBookings(p: SearchParams) {
  const where: SQL[] = [];
  if (p.userId) where.push(eq(bookings.userId, p.userId));
  if (p.q?.trim()) {
    const q = `%${p.q.trim()}%`;
    where.push(
      or(
        ilike(bookings.contactName, q),
        ilike(bookings.contactNim, q),
        ilike(bookings.code, q),
        ilike(bookings.purpose, q),
      )!,
    );
  }
  if (p.status && STATUSES.includes(p.status as BookingStatus)) where.push(eq(bookings.status, p.status as BookingStatus));
  if (p.roomId) where.push(eq(bookings.roomId, p.roomId));
  if (p.from && isValidDate(p.from)) where.push(gte(bookings.startAt, wib(p.from, "00:00")));
  if (p.to && isValidDate(p.to)) where.push(lt(bookings.startAt, wib(addDays(p.to, 1), "00:00")));

  const pageSize = Math.min(Math.max(p.pageSize ?? 20, 1), 5000);
  const page = Math.max(p.page ?? 1, 1);
  const cond = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ b: bookings, roomName: rooms.name })
      .from(bookings)
      .innerJoin(rooms, eq(rooms.id, bookings.roomId))
      .where(cond)
      .orderBy(desc(bookings.startAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(bookings).where(cond),
  ]);

  return { items: rows.map((r) => toDTO(r.b, r.roomName)), total, page, pageSize };
}
