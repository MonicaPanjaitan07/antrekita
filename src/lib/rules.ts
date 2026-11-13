import { db, schema } from "@/db";
import { dayName } from "./time";

// Jam layanan Perpustakaan IT Del (sumber: del.ac.id/?page_id=146):
// Senin–Jumat 08:00–21:45 WIB, Sabtu 08:00–12:00 WIB, Minggu tutup.
export const DEFAULT_HOURS: Record<number, { open: string | null; close: string | null }> = {
  0: { open: null, close: null },
  1: { open: "08:00", close: "21:45" },
  2: { open: "08:00", close: "21:45" },
  3: { open: "08:00", close: "21:45" },
  4: { open: "08:00", close: "21:45" },
  5: { open: "08:00", close: "21:45" },
  6: { open: "08:00", close: "12:00" },
};

export type Rules = {
  slotMinutes: number;
  maxDurationMinutes: number;
  minPeople: number;
  maxAdvanceDays: number;
  maxActivePerUser: number;
  checkinGraceMinutes: number;
  checkinEarlyMinutes: number;
  hours: Record<number, { open: string | null; close: string | null }>;
};

export async function getRules(): Promise<Rules> {
  const [settingRows, hours] = await Promise.all([
    db.select().from(schema.settings).limit(1),
    db.select().from(schema.openingHours),
  ]);
  const setting = settingRows[0];
  const map = { ...DEFAULT_HOURS };
  for (const h of hours) map[h.dayOfWeek] = { open: h.openTime, close: h.closeTime };
  return {
    slotMinutes: setting?.slotMinutes ?? 30,
    maxDurationMinutes: setting?.maxDurationMinutes ?? 120,
    minPeople: setting?.minPeople ?? 2,
    maxAdvanceDays: setting?.maxAdvanceDays ?? 7,
    maxActivePerUser: setting?.maxActivePerUser ?? 2,
    checkinGraceMinutes: setting?.checkinGraceMinutes ?? 15,
    checkinEarlyMinutes: setting?.checkinEarlyMinutes ?? 10,
    hours: map,
  };
}

/** Ringkasan aturan dalam kalimat, dipakai di UI dan sebagai konteks AI */
export function describeRules(r: Rules): string[] {
  const hours = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const h = r.hours[d];
    return `${dayName(d)}: ${h?.open && h?.close ? `${h.open}–${h.close} WIB` : "tutup"}`;
  });
  return [
    `Jam layanan — ${hours.join("; ")}.`,
    `Durasi booking maksimal ${r.maxDurationMinutes} menit, dalam kelipatan ${r.slotMinutes} menit.`,
    `Minimal ${r.minPeople} orang per booking dan tidak melebihi kapasitas ruangan.`,
    `Booking bisa dibuat paling jauh ${r.maxAdvanceDays} hari ke depan.`,
    `Setiap mahasiswa maksimal punya ${r.maxActivePerUser} booking aktif.`,
    `Check-in dibuka ${r.checkinEarlyMinutes} menit sebelum jam mulai. Jika belum check-in ${r.checkinGraceMinutes} menit setelah jam mulai, booking otomatis hangus (no-show) dan ruangan dilepas.`,
  ];
}
