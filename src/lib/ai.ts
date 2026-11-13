import { GoogleGenAI, type Content, type FunctionDeclaration } from "@google/genai";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  ACTIVE_STATUSES,
  checkBooking,
  findFreeWindows,
  suggestAlternatives,
  toDTO,
  type Actor,
  type BookingInput,
} from "./booking";
import { HttpError } from "./http";
import { describeRules, getRules } from "./rules";
import {
  addDays,
  dayOfWeek,
  formatDateLong,
  isValidDate,
  normalizeTime,
  todayWIB,
  toWIBTime,
} from "./time";

export const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function aiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError(503, "Fitur AI belum aktif: GEMINI_API_KEY belum diisi oleh admin.");
  return new GoogleGenAI({ apiKey });
}

function friendlyAiError(e: unknown): never {
  if (e instanceof HttpError) throw e;
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[gemini]", msg);
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg))
    throw new HttpError(429, "Kuota AI sedang habis. Coba lagi sebentar lagi, atau pakai kalender biasa.");
  if (/API key|PERMISSION_DENIED|401|403/i.test(msg))
    throw new HttpError(503, "Kunci API Gemini tidak valid. Hubungi admin.");
  throw new HttpError(502, "Asisten AI sedang tidak bisa dihubungi. Kamu tetap bisa booking lewat kalender.");
}

// ==================================================================
// 1) ASISTEN BOOKING (function calling)
// ==================================================================

export type ChatTurn = { role: "user" | "model"; text: string };
export type Proposal = {
  roomId: string;
  roomName: string;
  date: string;
  start: string;
  end: string;
  participants: number;
  purpose: string;
};

const tools: FunctionDeclaration[] = [
  {
    name: "get_rooms_and_rules",
    description:
      "Daftar ruang diskusi (id, nama, kapasitas, fasilitas) dan aturan booking perpustakaan. Panggil ini dulu bila perlu id ruangan.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "check_availability",
    description:
      "Cari slot kosong pada sebuah tanggal. Mengembalikan daftar jendela waktu kosong per ruangan yang memenuhi durasi & jumlah peserta.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Tanggal format YYYY-MM-DD (WIB)" },
        duration_minutes: { type: "integer", description: "Durasi yang dibutuhkan dalam menit. Default 60." },
        participants: { type: "integer", description: "Jumlah orang (opsional)" },
        from_time: { type: "string", description: "Batas awal pencarian HH:MM (opsional)" },
        to_time: { type: "string", description: "Batas akhir pencarian HH:MM (opsional)" },
      },
      required: ["date"],
    },
  },
  {
    name: "propose_booking",
    description:
      "Validasi sebuah rencana booking. TIDAK menyimpan booking. Jika valid, pengguna akan melihat kartu konfirmasi dan harus menekan tombol 'Konfirmasi' sendiri. Jika tidak valid, mengembalikan alasan dan alternatif.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        room_id: { type: "string", description: "id ruangan dari get_rooms_and_rules / check_availability" },
        date: { type: "string", description: "YYYY-MM-DD" },
        start_time: { type: "string", description: "HH:MM" },
        end_time: { type: "string", description: "HH:MM" },
        participants: { type: "integer" },
        purpose: { type: "string", description: "Keperluan singkat, mis. 'Kerja kelompok Basis Data'" },
      },
      required: ["room_id", "date", "start_time", "end_time", "participants", "purpose"],
    },
  },
  {
    name: "get_my_bookings",
    description: "Daftar booking aktif milik pengguna yang sedang login.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
];

type ToolCtx = { actor: Actor; proposal: Proposal | null };

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<unknown> {
  switch (name) {
    case "get_rooms_and_rules": {
      const rules = await getRules();
      const rs = await db.select().from(schema.rooms).where(eq(schema.rooms.isActive, true)).orderBy(schema.rooms.name);
      return {
        rooms: rs.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, facilities: r.facilities })),
        rules: describeRules(rules),
      };
    }
    case "check_availability": {
      const date = String(args.date ?? "");
      if (!isValidDate(date)) return { error: "Tanggal tidak valid, gunakan YYYY-MM-DD." };
      const rules = await getRules();
      const h = rules.hours[dayOfWeek(date)];
      if (!h?.open) return { date, closed: true, message: "Perpustakaan tutup pada hari ini." };
      const duration = Number(args.duration_minutes) || 60;
      const windows = await findFreeWindows({
        date,
        durationMinutes: Math.min(duration, rules.maxDurationMinutes),
        participants: args.participants ? Number(args.participants) : undefined,
        from: args.from_time ? (normalizeTime(String(args.from_time)) ?? undefined) : undefined,
        to: args.to_time ? (normalizeTime(String(args.to_time)) ?? undefined) : undefined,
        limit: 40,
      });
      return {
        date,
        opening_hours: `${h.open}–${h.close}`,
        free_windows: windows.map((w) => ({ room_id: w.roomId, room: w.roomName, capacity: w.capacity, start: w.start, end: w.end })),
        note: windows.length ? undefined : "Tidak ada slot kosong yang cocok.",
      };
    }
    case "propose_booking": {
      const input: BookingInput = {
        roomId: String(args.room_id ?? ""),
        date: String(args.date ?? ""),
        start: normalizeTime(String(args.start_time ?? "")) ?? "",
        end: normalizeTime(String(args.end_time ?? "")) ?? "",
        participants: Number(args.participants),
        purpose: String(args.purpose ?? ""),
      };
      const check = await checkBooking(input, ctx.actor);
      if (!check.ok) {
        return { ok: false, errors: check.errors, alternatives: await suggestAlternatives(input) };
      }
      ctx.proposal = {
        roomId: check.room.id,
        roomName: check.room.name,
        date: input.date,
        start: input.start,
        end: input.end,
        participants: input.participants,
        purpose: input.purpose.trim(),
      };
      return { ok: true, message: "Valid. Kartu konfirmasi ditampilkan ke pengguna; booking BELUM tersimpan." };
    }
    case "get_my_bookings": {
      const rows = await db
        .select({ b: schema.bookings, roomName: schema.rooms.name })
        .from(schema.bookings)
        .innerJoin(schema.rooms, eq(schema.rooms.id, schema.bookings.roomId))
        .where(
          and(
            eq(schema.bookings.userId, ctx.actor.uid),
            inArray(schema.bookings.status, ACTIVE_STATUSES),
            gt(schema.bookings.endAt, new Date()),
          ),
        );
      return { bookings: rows.map((r) => toDTO(r.b, r.roomName)) };
    }
    default:
      return { error: `Fungsi ${name} tidak dikenal.` };
  }
}

function systemPrompt(name: string) {
  const today = todayWIB();
  const now = toWIBTime(new Date());
  const next7 = Array.from({ length: 8 }, (_, i) => {
    const d = addDays(today, i);
    return `${d} = ${formatDateLong(d)}`;
  }).join("\n");
  return `Kamu adalah "Asisten AntreKita", asisten booking ruang diskusi Perpustakaan Institut Teknologi Del (Laguboti, Toba).
Pengguna: ${name}. Sekarang ${formatDateLong(today)}, pukul ${now} WIB.
Kalender 8 hari ke depan (pakai ini untuk mengartikan "besok", "lusa", "Jumat", dll.):
${next7}

Tugasmu:
- Bantu mahasiswa mencari ruang kosong dan menyiapkan booking.
- Selalu cek data lewat fungsi. Jangan pernah mengarang ketersediaan, nama ruang, atau aturan.
- Sebelum propose_booking kamu butuh: tanggal, jam mulai, jam selesai, jumlah orang, dan keperluan. Jika ada yang kurang, tanyakan singkat (boleh sekaligus). Jika durasi tidak disebut, anggap 1 jam dan sebutkan asumsimu.
- Jika slot penuh, tawarkan alternatif terdekat dari hasil fungsi.
- Kamu TIDAK bisa menyimpan booking. Setelah propose_booking berhasil, katakan bahwa kartu konfirmasi muncul dan pengguna perlu menekan "Konfirmasi Booking".
- Jawab singkat, ramah, dalam bahasa yang dipakai pengguna (Indonesia/Inggris). Gunakan format jam 24 jam WIB.
- Tolak dengan sopan permintaan di luar urusan booking ruang perpustakaan.`;
}

export async function runChat(history: ChatTurn[], actor: Actor & { name: string }) {
  const ai = client();
  const contents: Content[] = history.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
  const ctx: ToolCtx = { actor, proposal: null };
  const toolsUsed: string[] = [];

  try {
    for (let step = 0; step < 6; step++) {
      const res = await ai.models.generateContent({
        model: MODEL(),
        contents,
        config: {
          systemInstruction: systemPrompt(actor.name),
          tools: [{ functionDeclarations: tools }],
          temperature: 0.3,
        },
      });
      const calls = res.functionCalls ?? [];
      const modelContent = res.candidates?.[0]?.content;
      if (!calls.length) {
        return { reply: res.text?.trim() || "Maaf, aku belum bisa menjawab. Coba ulangi dengan kalimat lain.", proposal: ctx.proposal, toolsUsed };
      }
      if (modelContent) contents.push(modelContent);
      const parts = [];
      for (const call of calls) {
        const name = call.name ?? "";
        toolsUsed.push(name);
        let output: unknown;
        try {
          output = await runTool(name, (call.args ?? {}) as Record<string, unknown>, ctx);
        } catch (e) {
          output = { error: e instanceof Error ? e.message : "Gagal menjalankan fungsi." };
        }
        parts.push({ functionResponse: { id: call.id, name, response: { output } } });
      }
      contents.push({ role: "user", parts });
    }
    return { reply: "Permintaannya cukup rumit. Bisa dijelaskan lebih singkat?", proposal: ctx.proposal, toolsUsed };
  } catch (e) {
    friendlyAiError(e);
  }
}

// ==================================================================
// 2) DIGITALISASI BUKU BOOKING (vision -> JSON)
// ==================================================================

export type ExtractedRow = {
  date: string | null;
  start: string | null;
  end: string | null;
  room: string | null;
  name: string | null;
  nim: string | null;
  participants: number | null;
  purpose: string | null;
  confidence: number;
  note: string | null;
};

const rowSchema = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD, kosong bila tidak terbaca" },
          start: { type: "string", description: "Jam mulai HH:MM (24 jam), kosong bila tidak terbaca" },
          end: { type: "string", description: "Jam selesai HH:MM (24 jam), kosong bila tidak terbaca" },
          room: { type: "string", description: "Nama/nomor ruang seperti tertulis, kosong bila tidak ada" },
          name: { type: "string", description: "Nama pemesan" },
          nim: { type: "string", description: "NIM pemesan, kosong bila tidak ada" },
          participants: { type: "integer", description: "Jumlah orang, 0 bila tidak tertulis" },
          purpose: { type: "string", description: "Keperluan, kosong bila tidak ada" },
          confidence: { type: "number", description: "0..1, seberapa yakin baris ini terbaca benar" },
          note: { type: "string", description: "Catatan singkat bila ada bagian yang ragu/tercoret, kosong bila tidak ada" },
        },
        required: ["date", "start", "end", "room", "name", "nim", "participants", "purpose", "confidence", "note"],
      },
    },
  },
  required: ["rows"],
};

export async function extractLogbook(opts: {
  base64: string;
  mimeType: string;
  roomNames: string[];
  defaultYear: number;
  defaultDate?: string;
}): Promise<ExtractedRow[]> {
  const ai = client();
  const prompt = `Ini adalah foto halaman buku catatan peminjaman ruang diskusi Perpustakaan IT Del (tulisan tangan).
Ekstrak SETIAP baris peminjaman menjadi data terstruktur.
- Ruang yang ada di sistem: ${opts.roomNames.join(", ")}. Tulis nama ruang seperti di buku; jangan menebak bila tidak tertulis.
- Tahun default bila tidak tertulis: ${opts.defaultYear}.${opts.defaultDate ? ` Bila tanggal tidak tertulis per baris, gunakan ${opts.defaultDate}.` : ""}
- Format tanggal Indonesia biasanya DD/MM atau DD-MM. Jam "13.00" = "13:00".
- Jangan mengarang. Bila sebuah kolom tidak terbaca, isi string kosong ("") atau 0, lalu turunkan confidence.
- Abaikan baris kosong, kop tabel, dan tanda tangan.`;
  try {
    const res = await ai.models.generateContent({
      model: MODEL(),
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: opts.mimeType, data: opts.base64 } }, { text: prompt }],
        },
      ],
      config: { responseMimeType: "application/json", responseJsonSchema: rowSchema, temperature: 0 },
    });
    type Raw = Partial<Record<keyof ExtractedRow, string | number | null>>;
    const parsed = JSON.parse(res.text ?? "{}") as { rows?: Raw[] };
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return (parsed.rows ?? []).map((raw): ExtractedRow => {
      const date = str(raw.date);
      const start = str(raw.start);
      const end = str(raw.end);
      return {
        date: date && isValidDate(date) ? date : null,
        start: start ? normalizeTime(start) : null,
        end: end ? normalizeTime(end) : null,
        room: str(raw.room),
        name: str(raw.name),
        nim: str(raw.nim),
        participants: Number(raw.participants) > 0 ? Math.round(Number(raw.participants)) : null,
        purpose: str(raw.purpose),
        confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
        note: str(raw.note),
      };
    });
  } catch (e) {
    if (e instanceof SyntaxError) throw new HttpError(502, "Hasil AI tidak bisa dibaca. Coba foto ulang dengan lebih jelas.");
    friendlyAiError(e);
  }
}

// ==================================================================
// 3) RINGKASAN LAPORAN (angka dihitung SQL, AI hanya menulis narasi)
// ==================================================================

export async function summarizeReport(stats: unknown): Promise<string> {
  const ai = client();
  try {
    const res = await ai.models.generateContent({
      model: MODEL(),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Berikut statistik pemakaian ruang diskusi Perpustakaan IT Del dalam format JSON.
Tulis ringkasan untuk kepala perpustakaan dalam bahasa Indonesia: 1 kalimat temuan utama, lalu 3–5 poin singkat (ruang tersibuk, jam/hari ramai, tingkat no-show & pembatalan, sumber booking), lalu 2 saran tindakan.
WAJIB hanya memakai angka yang ada di JSON. Jangan menambah angka baru. Format: teks biasa dengan poin "- ".

${JSON.stringify(stats)}`,
            },
          ],
        },
      ],
      config: { temperature: 0.2 },
    });
    return res.text?.trim() ?? "";
  } catch (e) {
    friendlyAiError(e);
  }
}
