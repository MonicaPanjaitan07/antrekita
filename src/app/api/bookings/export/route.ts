import { requireSession } from "@/lib/auth";
import { route } from "@/lib/http";
import { searchBookings } from "@/lib/queries";
import { todayWIB } from "@/lib/time";

export const dynamic = "force-dynamic";

const STATUS_ID: Record<string, string> = {
  BOOKED: "Dipesan",
  CHECKED_IN: "Sedang dipakai",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  NO_SHOW: "Tidak hadir",
};

function cell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Ekspor CSV (bisa dibuka di Excel) — sekaligus cadangan data untuk petugas.
export const GET = route(async (req) => {
  await requireSession("STAFF");
  const sp = new URL(req.url).searchParams;
  const { items } = await searchBookings({
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    roomId: sp.get("roomId") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    pageSize: 5000,
  });
  const header = ["Kode", "Tanggal", "Mulai", "Selesai", "Ruang", "Nama", "NIM", "Peserta", "Keperluan", "Status", "Sumber"];
  const lines = [header.join(",")].concat(
    items.map((b) =>
      [b.code, b.date, b.start, b.end, b.roomName, b.contactName, b.contactNim, b.participants, b.purpose, STATUS_ID[b.status], b.source]
        .map(cell)
        .join(","),
    ),
  );
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="antrekita-booking-${todayWIB()}.csv"`,
    },
  });
});
