// Mengisi data awal: aturan, jam layanan, ruangan, akun petugas & mahasiswa demo, contoh booking.
// Aman dijalankan berulang (tidak menduplikasi data).
// Pemakaian: npm run db:seed
import "./env";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { DEFAULT_HOURS } from "../src/lib/rules";
import { addDays, dayOfWeek, todayWIB, wib } from "../src/lib/time";

const { users, rooms, bookings, openingHours, settings } = schema;

// Website IT Del menyebut perpustakaan memiliki 2 unit ruang diskusi (del.ac.id/?page_id=146).
// Nama, kapasitas & fasilitas di bawah adalah contoh — sesuaikan dengan kondisi sebenarnya
// lewat menu Petugas → Pengaturan setelah aplikasi berjalan.
const ROOMS = [
  { name: "Ruang Diskusi 1", capacity: 6, location: "Perpustakaan IT Del", facilities: ["Whiteboard", "Stopkontak", "AC"], checkinCode: "RD1-TOBA" },
  { name: "Ruang Diskusi 2", capacity: 8, location: "Perpustakaan IT Del", facilities: ["Whiteboard", "Layar TV", "Stopkontak", "AC"], checkinCode: "RD2-SAMOSIR" },
];

async function main() {
  console.log("→ Aturan & jam layanan");
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  for (const [d, h] of Object.entries(DEFAULT_HOURS)) {
    await db
      .insert(openingHours)
      .values({ dayOfWeek: Number(d), openTime: h.open, closeTime: h.close })
      .onConflictDoNothing();
  }

  console.log("→ Ruangan");
  for (const r of ROOMS) await db.insert(rooms).values(r).onConflictDoNothing();

  console.log("→ Akun");
  const staffEmail = process.env.SEED_STAFF_EMAIL || "petugas@antrekita.id";
  const staffPass = process.env.SEED_STAFF_PASSWORD || "petugas123";
  await db
    .insert(users)
    .values({ name: "Petugas Perpustakaan", email: staffEmail, passwordHash: await bcrypt.hash(staffPass, 10), role: "STAFF" })
    .onConflictDoNothing();

  const withDemo = process.env.SEED_DEMO_DATA !== "false";
  const demoStudents = !withDemo ? [] : [
    { name: "Rina Hutapea", nim: "11S22001", email: "rina@demo.antrekita.id", prodi: "S1 Sistem Informasi" },
    { name: "Yosua Sitorus", nim: "11S22002", email: "yosua@demo.antrekita.id", prodi: "S1 Informatika" },
    { name: "Grace Simanjuntak", nim: "12S22003", email: "grace@demo.antrekita.id", prodi: "S1 Teknik Bioproses" },
  ];
  const demoHash = await bcrypt.hash("mahasiswa123", 10);
  for (const s of demoStudents) {
    await db.insert(users).values({ ...s, passwordHash: demoHash }).onConflictDoNothing();
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings);
  if (count === 0 && withDemo) {
    console.log("→ Contoh booking (riwayat & jadwal mendatang)");
    const allRooms = await db.select().from(rooms);
    const allStudents = await db.select().from(users).where(sql`${users.role} = 'STUDENT'`);
    const purposes = [
      "Kerja kelompok Basis Data",
      "Diskusi Tugas Akhir",
      "Belajar bareng Kalkulus",
      "Rapat himpunan",
      "Persiapan presentasi PKM",
      "Latihan hackathon",
    ];
    const today = todayWIB();
    let n = 0;
    const rows: (typeof bookings.$inferInsert)[] = [];
    // Riwayat 21 hari terakhir
    for (let back = 21; back >= 1; back--) {
      const date = addDays(today, -back);
      const dow = dayOfWeek(date);
      if (dow === 0) continue;
      const slots = dow === 6 ? ["09:00", "10:30"] : ["10:00", "13:00", "15:00", "19:00"];
      slots.forEach((start, i) => {
        if ((back + i) % 3 === 0) return; // biar tidak penuh semua
        const room = allRooms[(back + i) % allRooms.length];
        const student = allStudents[(back * 7 + i) % allStudents.length];
        const [h, m] = start.split(":").map(Number);
        const end = `${String(h + (i % 2 === 0 ? 2 : 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const status = (back + i) % 7 === 0 ? "NO_SHOW" : (back + i) % 11 === 0 ? "CANCELLED" : "COMPLETED";
        rows.push({
          code: `AK-S${String(++n).padStart(4, "0")}`,
          roomId: room.id,
          userId: student.id,
          createdById: student.id,
          contactName: student.name,
          contactNim: student.nim,
          purpose: purposes[(back + i) % purposes.length],
          participants: 2 + ((back + i) % 5),
          startAt: wib(date, start),
          endAt: wib(date, end),
          status,
          source: (back + i) % 4 === 0 ? "AI_CHAT" : "WEB",
          checkedInAt: status === "COMPLETED" ? wib(date, start) : null,
        });
      });
    }
    // Beberapa booking mendatang (hari buka berikutnya). Sabtu hanya buka sampai 12:00.
    const nextWeekday = (from: string) => {
      let d = addDays(from, 1);
      while (dayOfWeek(d) === 0 || dayOfWeek(d) === 6) d = addDays(d, 1);
      return d;
    };
    const day1 = nextWeekday(today);
    const day2 = nextWeekday(day1);
    for (const [date, start, end, ri] of [
      [day1, "13:00", "15:00", 0],
      [day1, "16:00", "17:00", 1],
      [day2, "10:00", "12:00", 1],
    ] as const) {
      const offset = date === day1 ? 1 : 2;
      const student = allStudents[(offset + ri) % allStudents.length];
      rows.push({
        code: `AK-S${String(++n).padStart(4, "0")}`,
        roomId: allRooms[ri % allRooms.length].id,
        userId: student.id,
        createdById: student.id,
        contactName: student.name,
        contactNim: student.nim,
        purpose: purposes[(offset + ri) % purposes.length],
        participants: 4,
        startAt: wib(date, start),
        endAt: wib(date, end),
        status: "BOOKED",
        source: "WEB",
      });
    }
    if (rows.length) await db.insert(bookings).values(rows);
    console.log(`  ${rows.length} booking contoh dibuat.`);
  }

  console.log("\n✓ Seed selesai.");
  console.log(`  Petugas  : ${staffEmail} (password sesuai SEED_STAFF_PASSWORD)`);
  if (withDemo) console.log(`  Mahasiswa: rina@demo.antrekita.id / mahasiswa123 (atau NIM 11S22001)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
