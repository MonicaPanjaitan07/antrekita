import { and, count, eq, gt, gte, inArray, lt, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Booking, BookingSource, BookingStatus, Room } from "@/db/schema";
import { HttpError } from "./http";
import { getRules, type Rules } from "./rules";
import type { Role } from "./session-token";
import {
  dayOfWeek,
  diffDays,
  fromMinutes,
  isValidDate,
  isValidTime,
  todayWIB,
  toMinutes,
  toWIBDate,
  toWIBTime,
  wib,
} from "./time";

const { bookings, rooms, users } = schema;

export const ACTIVE_STATUSES: BookingStatus[] = ["BOOKED", "CHECKED_IN"];

export type Actor = { uid: string; role: Role };

export type BookingInput = {
  roomId: string;
  date: string; // YYYY-MM-DD (WIB)
  start: string; // HH:MM (WIB)
  end: string; // HH:MM (WIB)
  participants: number;
  purpose: string;
  contactName?: string; // diisi petugas saat membuatkan booking (walk-in)
  contactNim?: string;
};

export type BookingDTO = {
  id: string;
  code: string;
  roomId: string;
  roomName: string;
  date: string;
  start: string;
  end: string;
  status: BookingStatus;
  source: BookingSource;
  participants: number;
  purpose: string;
  contactName: string;
  contactNim: string | null;
  checkedInAt: string | null;
  createdAt: string;
};

export function toDTO(b: Booking, roomName: string): BookingDTO {
  return {
    id: b.id,
    code: b.code,
    roomId: b.roomId,
    roomName,
    date: toWIBDate(b.startAt),
    start: toWIBTime(b.startAt),
    end: toWIBTime(b.endAt),
    status: b.status,
    source: b.source,
    participants: b.participants,
    purpose: b.purpose,
    contactName: b.contactName,
    contactNim: b.contactNim,
    checkedInAt: b.checkedInAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}

async function roomName(roomId: string) {
  const [r] = await db.select({ name: rooms.name }).from(rooms).where(eq(rooms.id, roomId));
  return r?.name ?? "-";
}

// ------------------------------------------------------------------
// Pembaruan status otomatis (no-show & selesai)
// ------------------------------------------------------------------

let lastSweep = 0;

/**
 * - BOOKED yang belum check-in sampai batas toleransi -> NO_SHOW (slot dilepas)
 * - CHECKED_IN yang jam selesainya lewat -> COMPLETED
 * Dipanggil sebelum membaca ketersediaan / membuat booking (maks. tiap 20 detik).
 */
export async function sweepStatuses(force = false) {
  const now = Date.now();
  if (!force && now - lastSweep < 20_000) return;
  lastSweep = now;
  const rules = await getRules();
  const cutoff = new Date(now - rules.checkinGraceMinutes * 60_000);
  await db
    .update(bookings)
    .set({ status: "NO_SHOW" })
    .where(and(eq(bookings.status, "BOOKED"), lt(bookings.startAt, cutoff)));
  await db
    .update(bookings)
    .set({ status: "COMPLETED" })
    .where(and(eq(bookings.status, "CHECKED_IN"), lte(bookings.endAt, new Date(now))));
}

// ------------------------------------------------------------------
// Validasi
// ------------------------------------------------------------------

type CheckResult =
  | { ok: true; room: Room; startAt: Date; endAt: Date; rules: Rules }
  | { ok: false; errors: string[]; rules: Rules };

export async function checkBooking(input: BookingInput, actor: Actor | null): Promise<CheckResult> {
  const rules = await getRules();
  const errors: string[] = [];
  const fail = (): CheckResult => ({ ok: false, errors, rules });

  if (!isValidDate(input.date)) errors.push("Format tanggal tidak valid (YYYY-MM-DD).");
  if (!isValidTime(input.start) || !isValidTime(input.end)) errors.push("Format jam tidak valid (HH:MM).");
  if (errors.length) return fail();

  const [room] = await db.select().from(rooms).where(eq(rooms.id, input.roomId));
  if (!room || !room.isActive) {
    errors.push("Ruangan tidak ditemukan atau sedang tidak bisa dipakai.");
    return fail();
  }

  const startMin = toMinutes(input.start);
  const endMin = toMinutes(input.end);
  const duration = endMin - startMin;
  const hours = rules.hours[dayOfWeek(input.date)];
  const startAt = wib(input.date, input.start);
  const endAt = wib(input.date, input.end);
  const now = new Date();

  if (!hours?.open || !hours?.close) {
    errors.push("Perpustakaan tutup pada hari tersebut.");
  } else {
    const openMin = toMinutes(hours.open);
    const closeMin = toMinutes(hours.close);
    if (startMin < openMin || endMin > closeMin) {
      errors.push(`Di luar jam layanan (${hours.open}–${hours.close} WIB).`);
    } else if ((startMin - openMin) % rules.slotMinutes !== 0 || ((endMin - openMin) % rules.slotMinutes !== 0 && endMin !== closeMin)) {
      errors.push(`Jam harus mengikuti slot ${rules.slotMinutes} menit (mis. 13:00, 13:30).`);
    }
  }
  if (duration <= 0) errors.push("Jam selesai harus setelah jam mulai.");
  else if (duration > rules.maxDurationMinutes) errors.push(`Durasi maksimal ${rules.maxDurationMinutes} menit.`);

  if (endAt <= now) errors.push("Waktu tersebut sudah lewat.");
  else if (startAt.getTime() < now.getTime() - rules.checkinGraceMinutes * 60_000)
    errors.push("Jam mulai sudah lewat terlalu lama, pilih slot berikutnya.");

  if (diffDays(todayWIB(), input.date) > rules.maxAdvanceDays)
    errors.push(`Booking paling jauh ${rules.maxAdvanceDays} hari ke depan.`);

  if (!Number.isInteger(input.participants) || input.participants < rules.minPeople)
    errors.push(`Minimal ${rules.minPeople} orang per booking.`);
  else if (input.participants > room.capacity) errors.push(`Kapasitas ${room.name} hanya ${room.capacity} orang.`);

  if (!input.purpose || input.purpose.trim().length < 3) errors.push("Isi keperluan booking (min. 3 karakter).");

  if (actor?.role === "STUDENT") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(bookings)
      .where(
        and(eq(bookings.userId, actor.uid), inArray(bookings.status, ACTIVE_STATUSES), gt(bookings.endAt, now)),
      );
    if (n >= rules.maxActivePerUser)
      errors.push(`Kamu sudah punya ${n} booking aktif (maksimal ${rules.maxActivePerUser}).`);
  }
  if (actor?.role === "STAFF" && !input.contactName?.trim()) errors.push("Isi nama pemesan (booking oleh petugas).");

  if (errors.length) return fail();

  const [clash] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, room.id),
        inArray(bookings.status, ACTIVE_STATUSES),
        lt(bookings.startAt, endAt),
        gt(bookings.endAt, startAt),
      ),
    )
    .limit(1);
  if (clash) {
    errors.push(`${room.name} sudah terisi pada ${toWIBTime(clash.startAt)}–${toWIBTime(clash.endAt)}.`);
    return fail();
  }

  return { ok: true, room, startAt, endAt, rules };
}

// ------------------------------------------------------------------
// Membuat booking
// ------------------------------------------------------------------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `AK-${s}`;
}

function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.cause?.code ?? err?.code;
}

/** 23P01 = exclusion_violation (constraint booking_no_overlap) */
export function isOverlapError(e: unknown) {
  return pgCode(e) === "23P01";
}

export async function createBooking(input: BookingInput, actor: Actor, source: BookingSource) {
  await sweepStatuses(true);
  const check = await checkBooking(input, actor);
  if (!check.ok) throw new HttpError(409, check.errors[0], { errors: check.errors });

  const [user] =
    actor.role === "STUDENT" ? await db.select().from(users).where(eq(users.id, actor.uid)) : [undefined];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [b] = await db
        .insert(bookings)
        .values({
          code: generateCode(),
          roomId: check.room.id,
          userId: actor.role === "STUDENT" ? actor.uid : null,
          createdById: actor.uid,
          contactName: actor.role === "STUDENT" ? (user?.name ?? "Mahasiswa") : input.contactName!.trim(),
          contactNim: actor.role === "STUDENT" ? (user?.nim ?? null) : input.contactNim?.trim() || null,
          purpose: input.purpose.trim(),
          participants: input.participants,
          startAt: check.startAt,
          endAt: check.endAt,
          source: actor.role === "STAFF" && source === "WEB" ? "STAFF" : source,
        })
        .returning();
      return toDTO(b, check.room.name);
    } catch (e) {
      if (isOverlapError(e)) throw new HttpError(409, "Slot ini baru saja dipesan orang lain. Silakan pilih slot lain.");
      if (pgCode(e) === "23505") continue; // kode booking kebetulan sama, ulangi
      throw e;
    }
  }
  throw new HttpError(500, "Gagal membuat kode booking, coba lagi.");
}

// ------------------------------------------------------------------
// Ketersediaan
// ------------------------------------------------------------------

export type SlotState = "free" | "busy" | "mine" | "past";
export type RoomAvailability = {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  facilities: string[];
  slots: { start: string; end: string; state: SlotState; label?: string }[];
  freeNow: boolean;
};
export type Availability = {
  date: string;
  open: string | null;
  close: string | null;
  slotMinutes: number;
  rooms: RoomAvailability[];
};

export async function getAvailability(date: string, actor: Actor | null): Promise<Availability> {
  await sweepStatuses();
  const rules = await getRules();
  const hours = rules.hours[dayOfWeek(date)];
  const roomList = await db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(rooms.name);
  const result: Availability = {
    date,
    open: hours?.open ?? null,
    close: hours?.close ?? null,
    slotMinutes: rules.slotMinutes,
    rooms: [],
  };
  const base = (r: Room) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    location: r.location,
    facilities: r.facilities,
  });
  if (!hours?.open || !hours?.close) {
    result.rooms = roomList.map((r) => ({ ...base(r), slots: [], freeNow: false }));
    return result;
  }

  const dayStart = wib(date, hours.open);
  const dayEnd = wib(date, hours.close);
  const dayBookings = await db
    .select()
    .from(bookings)
    .where(
      and(inArray(bookings.status, ACTIVE_STATUSES), lt(bookings.startAt, dayEnd), gt(bookings.endAt, dayStart)),
    );

  const now = Date.now();
  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);

  for (const r of roomList) {
    const inRoom = dayBookings.filter((b) => b.roomId === r.id);
    const slots: RoomAvailability["slots"] = [];
    for (let m = openMin; m < closeMin; m += rules.slotMinutes) {
      const start = fromMinutes(m);
      const end = fromMinutes(Math.min(m + rules.slotMinutes, closeMin));
      const s = wib(date, start).getTime();
      const e = wib(date, end).getTime();
      const hit = inRoom.find((b) => b.startAt.getTime() < e && b.endAt.getTime() > s);
      let state: SlotState = "free";
      let label: string | undefined;
      if (hit) {
        state = actor && hit.userId === actor.uid ? "mine" : "busy";
        if (actor?.role === "STAFF") label = `${hit.contactName} · ${hit.code}`;
        else if (state === "mine") label = hit.code;
      } else if (e <= now) {
        state = "past";
      }
      slots.push({ start, end, state, label });
    }
    const nowSlot = slots.find((sl) => wib(date, sl.start).getTime() <= now && wib(date, sl.end).getTime() > now);
    result.rooms.push({ ...base(r), slots, freeNow: nowSlot?.state === "free" });
  }
  return result;
}

export type FreeWindow = { roomId: string; roomName: string; capacity: number; start: string; end: string };

/** Cari jendela waktu kosong (dipakai asisten AI & saran alternatif). */
export async function findFreeWindows(opts: {
  date: string;
  durationMinutes: number;
  participants?: number;
  roomId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<FreeWindow[]> {
  const av = await getAvailability(opts.date, null);
  const out: FreeWindow[] = [];
  const need = Math.max(1, Math.ceil(opts.durationMinutes / av.slotMinutes));
  for (const room of av.rooms) {
    if (opts.roomId && room.id !== opts.roomId) continue;
    if (opts.participants && room.capacity < opts.participants) continue;
    for (let i = 0; i + need <= room.slots.length; i++) {
      const win = room.slots.slice(i, i + need);
      if (!win.every((s) => s.state === "free")) continue;
      const start = win[0].start;
      const end = win[win.length - 1].end;
      // slot yang sedang berjalan boleh, asal belum lewat batas check-in
      if (opts.from && toMinutes(start) < toMinutes(opts.from)) continue;
      if (opts.to && toMinutes(end) > toMinutes(opts.to)) continue;
      out.push({ roomId: room.id, roomName: room.name, capacity: room.capacity, start, end });
    }
  }
  return out.slice(0, opts.limit ?? 50);
}

/** Saran alternatif terdekat ketika slot yang diminta tidak tersedia. */
export async function suggestAlternatives(input: BookingInput, max = 4) {
  if (!isValidDate(input.date) || !isValidTime(input.start) || !isValidTime(input.end)) return [];
  const duration = toMinutes(input.end) - toMinutes(input.start);
  if (duration <= 0) return [];
  const windows = await findFreeWindows({
    date: input.date,
    durationMinutes: duration,
    participants: input.participants,
    limit: 500,
  });
  const target = toMinutes(input.start);
  return windows
    .map((w) => ({ w, score: Math.abs(toMinutes(w.start) - target) + (w.roomId === input.roomId ? 0 : 15) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, max)
    .map(({ w }) => ({ ...w, date: input.date }));
}

// ------------------------------------------------------------------
// Aksi: batal, check-in, selesai
// ------------------------------------------------------------------

async function getBooking(id: string) {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!b) throw new HttpError(404, "Booking tidak ditemukan.");
  return b;
}

export async function cancelBooking(id: string, actor: Actor, reason?: string) {
  const b = await getBooking(id);
  if (actor.role === "STUDENT" && b.userId !== actor.uid) throw new HttpError(403, "Ini bukan booking milikmu.");
  if (!ACTIVE_STATUSES.includes(b.status)) throw new HttpError(409, "Booking ini sudah tidak aktif.");
  const [u] = await db
    .update(bookings)
    .set({
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason?.trim() || (actor.role === "STAFF" ? "Dibatalkan petugas" : "Dibatalkan pemesan"),
    })
    .where(eq(bookings.id, id))
    .returning();
  return toDTO(u, await roomName(u.roomId));
}

export async function checkInBooking(id: string, actor: Actor) {
  const b = await getBooking(id);
  const rules = await getRules();
  if (actor.role === "STUDENT" && b.userId !== actor.uid) throw new HttpError(403, "Ini bukan booking milikmu.");
  if (b.status !== "BOOKED") throw new HttpError(409, "Booking ini tidak bisa di-check-in.");
  const now = Date.now();
  const opensAt = b.startAt.getTime() - rules.checkinEarlyMinutes * 60_000;
  const closesAt = b.startAt.getTime() + rules.checkinGraceMinutes * 60_000;
  if (actor.role === "STUDENT") {
    if (now < opensAt) throw new HttpError(409, `Check-in dibuka ${rules.checkinEarlyMinutes} menit sebelum jam mulai.`);
    if (now > closesAt) throw new HttpError(409, "Batas waktu check-in sudah lewat.");
  }
  const [u] = await db
    .update(bookings)
    .set({ status: "CHECKED_IN", checkedInAt: new Date() })
    .where(eq(bookings.id, id))
    .returning();
  return toDTO(u, await roomName(u.roomId));
}

/** Check-in lewat kode yang ditempel di pintu ruangan (QR/kode). */
export async function checkInByRoomCode(code: string, actor: Actor) {
  const [room] = await db.select().from(rooms).where(eq(rooms.checkinCode, code.trim().toUpperCase()));
  if (!room) throw new HttpError(404, "Kode ruangan tidak dikenali.");
  const rules = await getRules();
  const now = Date.now();
  const [b] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, room.id),
        eq(bookings.userId, actor.uid),
        eq(bookings.status, "BOOKED"),
        lte(bookings.startAt, new Date(now + rules.checkinEarlyMinutes * 60_000)),
        gte(bookings.startAt, new Date(now - rules.checkinGraceMinutes * 60_000)),
      ),
    )
    .limit(1);
  if (!b) {
    throw new HttpError(
      404,
      `Tidak ada booking milikmu di ${room.name} yang bisa di-check-in sekarang. Check-in dibuka ${rules.checkinEarlyMinutes} menit sebelum jam mulai.`,
    );
  }
  return checkInBooking(b.id, actor);
}

export async function completeBooking(id: string) {
  const b = await getBooking(id);
  if (!ACTIVE_STATUSES.includes(b.status)) throw new HttpError(409, "Booking ini sudah tidak aktif.");
  const now = new Date();
  const [u] = await db
    .update(bookings)
    .set({ status: "COMPLETED", endAt: b.startAt < now && b.endAt > now ? now : b.endAt })
    .where(eq(bookings.id, id))
    .returning();
  return toDTO(u, await roomName(u.roomId));
}
