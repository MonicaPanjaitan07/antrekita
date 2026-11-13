// Label & warna status — aman dipakai di client maupun server.

export const STATUS_LABEL: Record<string, string> = {
  BOOKED: "Menunggu check-in",
  CHECKED_IN: "Sedang dipakai",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  NO_SHOW: "Tidak hadir",
};

export const STATUS_CLASS: Record<string, string> = {
  BOOKED: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  CHECKED_IN: "bg-lake-50 text-lake-700 ring-1 ring-lake-200",
  COMPLETED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  NO_SHOW: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

export const SOURCE_LABEL: Record<string, string> = {
  WEB: "Kalender",
  AI_CHAT: "Asisten AI",
  STAFF: "Petugas",
  LOGBOOK: "Buku manual",
};
