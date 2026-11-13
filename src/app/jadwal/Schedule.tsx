"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconCheck, IconChat, IconClock, IconUsers, IconX } from "@/components/Icons";
import type { Availability, BookingDTO } from "@/lib/booking";
import { api } from "@/lib/client";
import { formatDateLong, formatDateShort, toMinutes } from "@/lib/time";

type Props = {
  days: { date: string; closed: boolean }[];
  initialDate: string;
  role: "STUDENT" | "STAFF" | null;
  rules: { maxDurationMinutes: number; minPeople: number; slotMinutes: number };
};

type Selection = { roomId: string; from: number; to: number } | null;

const SLOT_STYLE: Record<string, string> = {
  free: "bg-lake-50 text-lake-700 ring-1 ring-lake-200 hover:bg-lake-100 hover:ring-lake-300",
  busy: "bg-rose-50 text-rose-400 ring-1 ring-rose-100 cursor-not-allowed line-through decoration-rose-300",
  mine: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 cursor-default",
  past: "bg-slate-100 text-slate-300 cursor-not-allowed",
  selected: "bg-brand-600 text-white ring-2 ring-brand-300 shadow-sm",
};

export function Schedule({ days, initialDate, role, rules }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [av, setAv] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Selection>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<BookingDTO | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setAv(await api<Availability>(`/api/availability?date=${date}`));
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [date],
  );

  useEffect(() => {
    setSel(null);
    load();
    const t = setInterval(() => load(true), 30_000);
    window.history.replaceState(null, "", `/jadwal?date=${date}`);
    return () => clearInterval(t);
  }, [date, load]);

  const maxSlots = Math.max(1, Math.floor(rules.maxDurationMinutes / rules.slotMinutes));

  function clickSlot(roomId: string, i: number) {
    const room = av?.rooms.find((r) => r.id === roomId);
    if (!room || room.slots[i].state !== "free") return;
    setNotice(null);
    if (!sel || sel.roomId !== roomId) return setSel({ roomId, from: i, to: i });
    if (i === sel.from && i === sel.to) return setSel(null);
    const from = Math.min(sel.from, i);
    const to = Math.max(sel.from, i);
    if (to - from + 1 > maxSlots) {
      setNotice(`Durasi maksimal ${rules.maxDurationMinutes} menit.`);
      return setSel({ roomId, from: i, to: i });
    }
    if (room.slots.slice(from, to + 1).some((s) => s.state !== "free")) {
      setNotice("Ada slot terisi di antaranya. Pilih rentang yang semuanya kosong.");
      return setSel({ roomId, from: i, to: i });
    }
    setSel({ roomId, from, to });
  }

  const selRoom = sel ? av?.rooms.find((r) => r.id === sel.roomId) : undefined;
  const selStart = selRoom && sel ? selRoom.slots[sel.from].start : "";
  const selEnd = selRoom && sel ? selRoom.slots[sel.to].end : "";
  const selMinutes = selStart ? toMinutes(selEnd) - toMinutes(selStart) : 0;

  const freeCount = useMemo(
    () => av?.rooms.reduce((a, r) => a + r.slots.filter((s) => s.state === "free").length, 0) ?? 0,
    [av],
  );

  function proceed() {
    if (!role) {
      router.push(`/login?next=${encodeURIComponent(`/jadwal?date=${date}`)}`);
      return;
    }
    setOpen(true);
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Jadwal ruang diskusi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ketuk slot hijau untuk memilih jam mulai, lalu ketuk slot lain untuk jam selesai. Diperbarui otomatis.
          </p>
        </div>
        {role === "STUDENT" && (
          <Link href="/asisten" className="btn-secondary">
            <IconChat className="h-4 w-4 text-brand-600" /> Biar AI yang carikan
          </Link>
        )}
      </div>

      {/* Strip tanggal */}
      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {days.map((d) => {
          const active = d.date === date;
          const [w, rest] = formatDateShort(d.date).split(", ");
          return (
            <button
              key={d.date}
              onClick={() => setDate(d.date)}
              className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-soft"
                  : d.closed
                    ? "border-slate-200 bg-slate-100 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
              }`}
            >
              <span className={`text-xs font-medium ${active ? "text-brand-100" : ""}`}>{w}</span>
              <span className="text-sm font-bold">{rest}</span>
              {d.closed && <span className="text-[10px] font-semibold">Tutup</span>}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lake-100 ring-1 ring-lake-300" /> Kosong</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-200" /> Terisi</span>
        {role === "STUDENT" && <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" /> Booking kamu</span>}
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-600" /> Dipilih</span>
        {av?.open && <span className="ml-auto font-medium text-slate-600">{freeCount} slot kosong · {av.open}–{av.close} WIB</span>}
      </div>

      {error && <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="mt-4 space-y-4">
        {loading && !av &&
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="card h-48 animate-pulse bg-slate-100" />)}

        {av && !av.open && (
          <div className="card p-8 text-center text-slate-500">
            <div className="text-lg font-bold text-slate-700">Perpustakaan tutup</div>
            <p className="mt-1 text-sm">{formatDateLong(date)}. Pilih tanggal lain.</p>
          </div>
        )}

        {av?.open &&
          av.rooms.map((room) => (
            <section key={room.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{room.name}</h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><IconUsers className="h-3.5 w-3.5" /> maks. {room.capacity} orang</span>
                    {room.facilities.map((f) => (
                      <span key={f} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">{f}</span>
                    ))}
                  </div>
                </div>
                {date === days[0].date && (
                  <span className={`badge ${room.freeNow ? "bg-lake-50 text-lake-700 ring-1 ring-lake-200" : "bg-slate-100 text-slate-500"}`}>
                    {room.freeNow ? "Kosong sekarang" : "Sedang tidak tersedia"}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-9 xl:grid-cols-12">
                {room.slots.map((s, i) => {
                  const selected = sel?.roomId === room.id && i >= sel.from && i <= sel.to;
                  const style = selected ? SLOT_STYLE.selected : SLOT_STYLE[s.state];
                  return (
                    <button
                      key={s.start}
                      onClick={() => clickSlot(room.id, i)}
                      disabled={s.state !== "free" && !selected}
                      title={s.label ? `${s.start}–${s.end} · ${s.label}` : `${s.start}–${s.end}`}
                      className={`rounded-lg px-1 py-2 text-xs font-semibold tabular-nums transition ${style}`}
                    >
                      {s.start}
                    </button>
                  );
                })}
              </div>
              {role === "STAFF" && room.slots.some((s) => s.label) && (
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {Array.from(new Set(room.slots.filter((s) => s.label).map((s) => s.label))).map((l) => (
                    <span key={l} className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">{l}</span>
                  ))}
                </div>
              )}
            </section>
          ))}
      </div>

      {/* Panel pilihan */}
      {sel && selRoom && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-3 md:bottom-4">
          <div className="card mx-auto flex max-w-2xl animate-rise flex-wrap items-center gap-3 border-brand-200 p-3 pl-4 shadow-xl sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">{selRoom.name}</div>
              <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600">
                <IconClock className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{formatDateShort(date)}</span>
                <span className="whitespace-nowrap font-semibold text-slate-800">{selStart}–{selEnd}</span>
                <span className="whitespace-nowrap text-xs text-slate-400">{selMinutes} mnt</span>
              </div>
              {notice && <div className="text-xs text-amber-600">{notice}</div>}
            </div>
            <button className="btn-ghost px-2.5" onClick={() => setSel(null)} aria-label="Batal pilih"><IconX /></button>
            <button className="btn-primary" onClick={proceed}>{role ? "Lanjut booking" : "Masuk untuk booking"}</button>
          </div>
        </div>
      )}
      {!sel && notice && <p className="mt-3 text-sm text-amber-600">{notice}</p>}

      {open && sel && selRoom && (
        <BookingSheet
          role={role!}
          room={selRoom}
          date={date}
          start={selStart}
          end={selEnd}
          minPeople={rules.minPeople}
          onClose={() => setOpen(false)}
          onDone={(b) => {
            setOpen(false);
            setSel(null);
            setDone(b);
            load(true);
          }}
          onConflict={() => load(true)}
        />
      )}

      {done && <SuccessDialog booking={done} role={role} onClose={() => setDone(null)} />}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-rise rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function BookingSheet(props: {
  role: "STUDENT" | "STAFF";
  room: Availability["rooms"][number];
  date: string;
  start: string;
  end: string;
  minPeople: number;
  onClose: () => void;
  onDone: (b: BookingDTO) => void;
  onConflict: () => void;
}) {
  const { role, room, date, start, end } = props;
  const [participants, setParticipants] = useState(Math.min(Math.max(props.minPeople, 3), room.capacity));
  const [purpose, setPurpose] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactNim, setContactNim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ booking: BookingDTO }>("/api/bookings", {
        method: "POST",
        json: { roomId: room.id, date, start, end, participants, purpose, ...(role === "STAFF" ? { contactName, contactNim } : {}) },
      });
      props.onDone(res.booking);
    } catch (err) {
      setError((err as Error).message);
      if ((err as { status?: number }).status === 409) props.onConflict();
      setLoading(false);
    }
  }

  return (
    <Modal onClose={props.onClose}>
      <h2 className="text-xl font-extrabold text-slate-900">Konfirmasi booking</h2>
      <div className="mt-3 rounded-2xl bg-brand-50 p-4 text-sm">
        <div className="font-bold text-brand-900">{room.name}</div>
        <div className="mt-0.5 text-brand-800">{formatDateLong(date)}</div>
        <div className="text-brand-800">{start}–{end} WIB</div>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {role === "STAFF" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nama pemesan</label>
              <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            </div>
            <div>
              <label className="label">NIM (opsional)</label>
              <input className="input uppercase" value={contactNim} onChange={(e) => setContactNim(e.target.value)} />
            </div>
          </div>
        )}
        <div>
          <label className="label">Jumlah orang</label>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setParticipants((n) => Math.max(1, n - 1))}>−</button>
            <span className="w-10 text-center text-lg font-bold tabular-nums">{participants}</span>
            <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setParticipants((n) => Math.min(room.capacity, n + 1))}>+</button>
            <span className="text-xs text-slate-500">min. {props.minPeople}, maks. {room.capacity}</span>
          </div>
        </div>
        <div>
          <label className="label">Keperluan</label>
          <input className="input" placeholder="mis. Kerja kelompok Basis Data" value={purpose} onChange={(e) => setPurpose(e.target.value)} required minLength={3} maxLength={200} />
        </div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={props.onClose}>Batal</button>
          <button className="btn-primary flex-1" disabled={loading}>{loading ? "Menyimpan…" : "Booking sekarang"}</button>
        </div>
      </form>
    </Modal>
  );
}

function SuccessDialog({ booking, role, onClose }: { booking: BookingDTO; role: string | null; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lake-100 text-lake-600">
          <IconCheck className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-slate-900">Booking berhasil!</h2>
        <p className="mt-1 text-sm text-slate-500">Tunjukkan kode ini bila diminta petugas.</p>
        <div className="mt-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-6 py-3 font-mono text-2xl font-bold tracking-widest text-brand-700">
          {booking.code}
        </div>
        <div className="mt-4 text-sm text-slate-700">
          <b>{booking.roomName}</b> · {formatDateShort(booking.date)} · {booking.start}–{booking.end}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Jangan lupa check-in di ruangan maksimal 15 menit setelah jam mulai, atau booking otomatis hangus.
        </p>
        <div className="mt-5 flex w-full gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Tutup</button>
          {role === "STUDENT" && <Link href="/saya" className="btn-primary flex-1">Booking saya</Link>}
        </div>
      </div>
    </Modal>
  );
}
