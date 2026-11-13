// AntreKita — skema database (Drizzle ORM, PostgreSQL)
// Struktur tabel dibuat oleh file SQL di db/migrations/. File ini harus selalu sama dengan SQL tersebut.
// Anti double booking dijaga juga di level database (EXCLUDE constraint "booking_no_overlap").
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const tstz = (name: string) => timestamp(name, { precision: 3, mode: "date", withTimezone: true });

export const roleEnum = pgEnum("Role", ["STUDENT", "STAFF"]);
export const bookingStatusEnum = pgEnum("BookingStatus", [
  "BOOKED", // sudah dipesan, menunggu check-in
  "CHECKED_IN", // sudah check-in di ruangan
  "COMPLETED", // selesai dipakai
  "CANCELLED", // dibatalkan
  "NO_SHOW", // tidak check-in sampai batas waktu, slot dilepas otomatis
]);
export const bookingSourceEnum = pgEnum("BookingSource", [
  "WEB", // kalender / form
  "AI_CHAT", // asisten AI
  "STAFF", // dibuatkan petugas (walk-in)
  "LOGBOOK", // hasil digitalisasi buku catatan manual
]);

export const users = pgTable("User", {
  id: id(),
  name: text("name").notNull(),
  nim: text("nim").unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  role: roleEnum("role").notNull().default("STUDENT"),
  prodi: text("prodi"),
  createdAt: tstz("createdAt").notNull().defaultNow(),
});

export const rooms = pgTable("Room", {
  id: id(),
  name: text("name").notNull().unique(),
  capacity: integer("capacity").notNull(),
  location: text("location"),
  facilities: text("facilities").array().notNull().default([]),
  description: text("description"),
  checkinCode: text("checkinCode").notNull().unique(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: tstz("createdAt").notNull().defaultNow(),
});

export const logbookImports = pgTable("LogbookImport", {
  id: id(),
  uploadedById: text("uploadedById").notNull().references(() => users.id),
  label: text("label"),
  rowCount: integer("rowCount").notNull(),
  createdAt: tstz("createdAt").notNull().defaultNow(),
});

export const bookings = pgTable(
  "Booking",
  {
    id: id(),
    code: text("code").notNull().unique(),
    roomId: text("roomId").notNull().references(() => rooms.id),
    userId: text("userId").references(() => users.id, { onDelete: "set null" }),
    createdById: text("createdById").references(() => users.id, { onDelete: "set null" }),
    contactName: text("contactName").notNull(),
    contactNim: text("contactNim"),
    purpose: text("purpose").notNull(),
    participants: integer("participants").notNull(),
    startAt: tstz("startAt").notNull(),
    endAt: tstz("endAt").notNull(),
    status: bookingStatusEnum("status").notNull().default("BOOKED"),
    source: bookingSourceEnum("source").notNull().default("WEB"),
    checkedInAt: tstz("checkedInAt"),
    cancelledAt: tstz("cancelledAt"),
    cancelReason: text("cancelReason"),
    importId: text("importId").references(() => logbookImports.id, { onDelete: "set null" }),
    createdAt: tstz("createdAt").notNull().defaultNow(),
    updatedAt: tstz("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("Booking_roomId_startAt_idx").on(t.roomId, t.startAt),
    index("Booking_userId_startAt_idx").on(t.userId, t.startAt),
    index("Booking_status_startAt_idx").on(t.status, t.startAt),
    index("Booking_contactNim_idx").on(t.contactNim),
  ],
);

// 0 = Minggu ... 6 = Sabtu. openTime/closeTime null = tutup.
export const openingHours = pgTable("OpeningHour", {
  dayOfWeek: integer("dayOfWeek").primaryKey(),
  openTime: text("openTime"),
  closeTime: text("closeTime"),
});

// Aturan booking (satu baris, id = 1)
export const settings = pgTable("Setting", {
  id: integer("id").primaryKey().default(1),
  slotMinutes: integer("slotMinutes").notNull().default(30),
  maxDurationMinutes: integer("maxDurationMinutes").notNull().default(120),
  minPeople: integer("minPeople").notNull().default(2),
  maxAdvanceDays: integer("maxAdvanceDays").notNull().default(7),
  maxActivePerUser: integer("maxActivePerUser").notNull().default(2),
  checkinGraceMinutes: integer("checkinGraceMinutes").notNull().default(15),
  checkinEarlyMinutes: integer("checkinEarlyMinutes").notNull().default(10),
  updatedAt: tstz("updatedAt").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = Booking["status"];
export type BookingSource = Booking["source"];
