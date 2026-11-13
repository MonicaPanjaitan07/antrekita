// Semua jam di AntreKita memakai WIB (Asia/Jakarta, UTC+7, tanpa daylight saving).
// Server (mis. Vercel) berjalan di UTC, jadi konversi selalu dilakukan eksplisit di sini.

export const TZ = "Asia/Jakarta";
const OFFSET = "+07:00";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "YYYY-MM-DD" dari sebuah Date, dalam WIB */
export function toWIBDate(d: Date): string {
  return dateFmt.format(d);
}

/** "HH:MM" dari sebuah Date, dalam WIB */
export function toWIBTime(d: Date): string {
  return timeFmt.format(d);
}

export function todayWIB(): string {
  return toWIBDate(new Date());
}

/** Tanggal + jam WIB -> Date (UTC) */
export function wib(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${OFFSET}`);
}

/** 0 = Minggu ... 6 = Sabtu, untuk tanggal WIB */
export function dayOfWeek(date: string): number {
  return wib(date, "12:00").getUTCDay();
}

export function addDays(date: string, n: number): string {
  const d = wib(date, "12:00");
  d.setUTCDate(d.getUTCDate() + n);
  return toWIBDate(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((wib(to, "12:00").getTime() - wib(from, "12:00").getTime()) / 86_400_000);
}

export function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = wib(s, "12:00");
  return !Number.isNaN(d.getTime()) && toWIBDate(d) === s;
}

export function isValidTime(s: unknown): s is string {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Normalisasi "9", "9.30", "09:30", "14.00" -> "HH:MM" */
export function normalizeTime(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return fromMinutes(h * 60 + min);
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function dayName(dow: number): string {
  return DAYS[dow] ?? "";
}

/** "Sabtu, 21 November 2026" */
export function formatDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${DAYS[dayOfWeek(date)]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "Sab, 21 Nov" */
export function formatDateShort(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${DAYS[dayOfWeek(date)].slice(0, 3)}, ${d} ${MONTHS_SHORT[m - 1]}`;
}

export function formatDateTime(d: Date): string {
  return `${formatDateShort(toWIBDate(d))} · ${toWIBTime(d)}`;
}
