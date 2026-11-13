import { sql } from "drizzle-orm";
import { db } from "@/db";
import { addDays, dayName, todayWIB, wib } from "./time";

type Row = Record<string, unknown>;

async function q<T extends Row>(query: ReturnType<typeof sql>): Promise<T[]> {
  const res = await db.execute(query);
  return res.rows as T[];
}

/** Statistik pemakaian N hari terakhir (sampai hari ini). Semua dihitung di database. */
export async function computeStats(days = 30) {
  const to = todayWIB();
  const from = addDays(to, -(days - 1));
  const start = wib(from, "00:00");
  const end = wib(addDays(to, 1), "00:00");
  const range = sql`"startAt" >= ${start} AND "startAt" < ${end}`;

  const [statusRows, roomRows, hourRows, dowRows, sourceRows, dailyRows] = await Promise.all([
    q<{ status: string; n: number }>(sql`SELECT status::text, count(*)::int AS n FROM "Booking" WHERE ${range} GROUP BY 1`),
    q<{ room: string; n: number; hours: number }>(sql`
      SELECT r.name AS room, count(b.*)::int AS n,
             coalesce(round(sum(extract(epoch FROM (b."endAt" - b."startAt")) / 3600)::numeric, 1), 0)::float AS hours
      FROM "Room" r
      LEFT JOIN "Booking" b ON b."roomId" = r.id AND b."startAt" >= ${start} AND b."startAt" < ${end}
                            AND b.status IN ('COMPLETED','CHECKED_IN','BOOKED')
      GROUP BY r.name ORDER BY n DESC`),
    q<{ hour: number; n: number }>(sql`
      SELECT extract(hour FROM "startAt" AT TIME ZONE 'Asia/Jakarta')::int AS hour, count(*)::int AS n
      FROM "Booking" WHERE ${range} AND status <> 'CANCELLED' GROUP BY 1 ORDER BY 1`),
    q<{ dow: number; n: number }>(sql`
      SELECT extract(dow FROM "startAt" AT TIME ZONE 'Asia/Jakarta')::int AS dow, count(*)::int AS n
      FROM "Booking" WHERE ${range} AND status <> 'CANCELLED' GROUP BY 1 ORDER BY 1`),
    q<{ source: string; n: number }>(sql`SELECT source::text, count(*)::int AS n FROM "Booking" WHERE ${range} GROUP BY 1`),
    q<{ day: string; n: number }>(sql`
      SELECT to_char("startAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM "Booking" WHERE ${range} AND status <> 'CANCELLED' GROUP BY 1 ORDER BY 1`),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.n])) as Record<string, number>;
  const total = statusRows.reduce((a, r) => a + r.n, 0);
  const finished = (byStatus.COMPLETED ?? 0) + (byStatus.NO_SHOW ?? 0);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

  const dailyMap = new Map(dailyRows.map((r) => [r.day, r.n]));
  const daily = Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    return { date: d, count: dailyMap.get(d) ?? 0 };
  });

  return {
    period: { from, to, days },
    total,
    byStatus,
    noShowRatePct: pct(byStatus.NO_SHOW ?? 0, finished),
    cancelRatePct: pct(byStatus.CANCELLED ?? 0, total),
    byRoom: roomRows,
    byHour: hourRows,
    byWeekday: dowRows.map((r) => ({ day: dayName(r.dow), n: r.n })),
    bySource: Object.fromEntries(sourceRows.map((r) => [r.source, r.n])),
    daily,
  };
}

export type Stats = Awaited<ReturnType<typeof computeStats>>;
