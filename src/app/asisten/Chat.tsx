"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconCalendar, IconCheck, IconClock, IconSend, IconSparkle, IconUsers } from "@/components/Icons";
import { LogoMark } from "@/components/Logo";
import type { Proposal } from "@/lib/ai";
import type { BookingDTO } from "@/lib/booking";
import { api } from "@/lib/client";
import { formatDateLong } from "@/lib/time";

type Msg = {
  role: "user" | "model";
  text: string;
  proposal?: Proposal | null;
  booked?: BookingDTO | null;
  error?: boolean;
};

const SUGGESTIONS = [
  "Cari ruang untuk 5 orang besok jam 2 siang, 2 jam",
  "Ruang mana yang kosong sekarang?",
  "Hari Sabtu ada slot jam 9?",
  "Booking aktifku apa saja?",
];

export function Chat({ name, enabled }: { name: string; enabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, loading]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...msgs, { role: "user", text: t }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const history = next.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text.slice(0, 1000) }));
      const res = await api<{ reply: string; proposal: Proposal | null }>("/api/ai/chat", {
        method: "POST",
        json: { messages: history },
      });
      setMsgs((m) => [...m, { role: "model", text: res.reply, proposal: res.proposal }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "model", text: (e as Error).message, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  async function confirm(idx: number, p: Proposal) {
    setConfirming(idx);
    try {
      const res = await api<{ booking: BookingDTO }>("/api/bookings", {
        method: "POST",
        json: { roomId: p.roomId, date: p.date, start: p.start, end: p.end, participants: p.participants, purpose: p.purpose, source: "AI_CHAT" },
      });
      setMsgs((m) =>
        m.map((x, i) => (i === idx ? { ...x, booked: res.booking } : x)).concat({
          role: "model",
          text: `Beres! Booking ${res.booking.code} sudah tersimpan. Jangan lupa check-in di ruangan paling lambat 15 menit setelah ${res.booking.start}.`,
        }),
      );
    } catch (e) {
      setMsgs((m) => [...m, { role: "model", text: `Gagal menyimpan: ${(e as Error).message}`, error: true }]);
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="container-app flex h-[calc(100dvh-4rem-5rem)] max-w-3xl flex-col py-4 md:h-[calc(100dvh-4rem-1rem)]">
      <div className="flex items-center gap-3 pb-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-lake-500 text-white shadow-soft">
          <IconSparkle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Asisten AntreKita</h1>
          <p className="text-xs text-slate-500">Cari & siapkan booking dengan bahasa sehari-hari · didukung Gemini</p>
        </div>
      </div>

      <div className="card flex-1 overflow-y-auto p-4 sm:p-5">
        {!enabled && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            Asisten AI belum diaktifkan oleh admin (GEMINI_API_KEY kosong). Kamu tetap bisa booking lewat{" "}
            <Link href="/jadwal" className="font-semibold underline">kalender</Link>.
          </div>
        )}

        {msgs.length === 0 && enabled && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <LogoMark className="h-12 w-12" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">Halo{name ? `, ${name}` : ""}! 👋</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Ceritakan kebutuhanmu: kapan, berapa orang, berapa lama. Aku carikan ruang yang kosong.
            </p>
            <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex animate-rise ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${m.role === "user" ? "" : "w-full sm:w-auto"}`}>
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-brand-600 text-white"
                      : m.error
                        ? "rounded-bl-md bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        : "rounded-bl-md bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.text}
                </div>
                {m.proposal && (
                  <div className="mt-2 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-brand-500">Rencana booking</div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900">{m.proposal.roomName}</div>
                    <div className="mt-1 space-y-0.5 text-sm text-slate-700">
                      <div className="flex items-center gap-1.5"><IconCalendar className="h-4 w-4 text-slate-400" /> {formatDateLong(m.proposal.date)}</div>
                      <div className="flex items-center gap-1.5"><IconClock className="h-4 w-4 text-slate-400" /> {m.proposal.start}–{m.proposal.end} WIB</div>
                      <div className="flex items-center gap-1.5"><IconUsers className="h-4 w-4 text-slate-400" /> {m.proposal.participants} orang · {m.proposal.purpose}</div>
                    </div>
                    {m.booked ? (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-lake-50 px-3 py-2 text-sm font-semibold text-lake-700">
                        <IconCheck className="h-4 w-4" /> Tersimpan · {m.booked.code}
                      </div>
                    ) : (
                      <button className="btn-primary mt-3 w-full" disabled={confirming !== null} onClick={() => confirm(i, m.proposal!)}>
                        {confirming === i ? "Menyimpan…" : "Konfirmasi Booking"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="input flex-1 py-3"
          placeholder={enabled ? "mis. ruang buat 4 orang Jumat jam 3 sore" : "Asisten AI belum aktif"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!enabled}
          maxLength={1000}
        />
        <button className="btn-primary px-4" disabled={!enabled || loading || !input.trim()} aria-label="Kirim">
          <IconSend />
        </button>
      </form>
      <p className="mt-2 text-center text-[11px] text-slate-400">AI hanya menyiapkan rencana. Booking baru tersimpan setelah kamu menekan Konfirmasi.</p>
    </div>
  );
}
