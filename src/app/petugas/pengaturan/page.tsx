"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Rules } from "@/lib/rules";

type Room = {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  facilities: string[];
  checkinCode: string;
  isActive: boolean;
};

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAME = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const RULE_FIELDS: { k: keyof Omit<Rules, "hours">; label: string; suffix: string }[] = [
  { k: "maxDurationMinutes", label: "Durasi maksimal", suffix: "menit" },
  { k: "slotMinutes", label: "Ukuran slot", suffix: "menit" },
  { k: "minPeople", label: "Minimal peserta", suffix: "orang" },
  { k: "maxAdvanceDays", label: "Booking paling jauh", suffix: "hari ke depan" },
  { k: "maxActivePerUser", label: "Booking aktif per mahasiswa", suffix: "booking" },
  { k: "checkinEarlyMinutes", label: "Check-in dibuka", suffix: "menit sebelum mulai" },
  { k: "checkinGraceMinutes", label: "Batas check-in (no-show)", suffix: "menit setelah mulai" },
];

export default function PengaturanPage() {
  const [rules, setRules] = useState<Rules | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<Partial<Room> | null>(null);
  const [origin, setOrigin] = useState("");

  async function load() {
    const [r, rm] = await Promise.all([api<Rules>("/api/admin/settings"), api<{ rooms: Room[] }>("/api/admin/rooms")]);
    setRules(r);
    setRooms(rm.rooms);
  }
  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch((e) => setMsg({ ok: false, text: (e as Error).message }));
  }, []);

  async function saveRules(e: React.FormEvent) {
    e.preventDefault();
    if (!rules) return;
    try {
      setRules(await api<Rules>("/api/admin/settings", { method: "PUT", json: rules }));
      setMsg({ ok: true, text: "Aturan & jam layanan tersimpan." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  async function saveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const body = {
      name: editing.name,
      capacity: Number(editing.capacity),
      location: editing.location || null,
      facilities: editing.facilities ?? [],
      checkinCode: editing.checkinCode,
      isActive: editing.isActive ?? true,
    };
    try {
      if (editing.id) await api(`/api/admin/rooms/${editing.id}`, { method: "PATCH", json: body });
      else await api("/api/admin/rooms", { method: "POST", json: body });
      setEditing(null);
      setMsg({ ok: true, text: "Ruangan tersimpan." });
      await load();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <h1 className="page-title">Pengaturan</h1>
      <p className="mt-1 text-sm text-slate-500">Atur ruangan, jam layanan, dan aturan booking sesuai kebijakan perpustakaan.</p>
      {msg && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-lake-50 text-lake-800 ring-1 ring-lake-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>{msg.text}</div>
      )}

      {/* RUANGAN */}
      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Ruang diskusi</h2>
          <button className="btn-primary px-3 py-2" onClick={() => setEditing({ name: "", capacity: 6, facilities: [], checkinCode: "", isActive: true })}>+ Tambah ruang</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rooms.map((r) => (
            <div key={r.id} className={`rounded-2xl border p-4 ${r.isActive ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900">{r.name} {!r.isActive && <span className="text-xs font-normal">(nonaktif)</span>}</div>
                  <div className="text-sm text-slate-500">{r.capacity} orang · {r.facilities.join(", ") || "—"}</div>
                </div>
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(r)}>Ubah</button>
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="text-slate-500">Kode check-in (tempel di pintu, bisa dijadikan QR):</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-slate-800">{r.checkinCode}</div>
                <div className="mt-1 break-all font-mono text-[11px] text-brand-600">{origin}/checkin/{r.checkinCode}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <form onSubmit={saveRoom} onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-rise space-y-4 rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <h3 className="text-lg font-extrabold">{editing.id ? "Ubah ruang" : "Tambah ruang"}</h3>
            <div>
              <label className="label">Nama ruang</label>
              <input className="input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Kapasitas</label>
                <input type="number" min={1} className="input" value={editing.capacity ?? ""} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="label">Kode check-in</label>
                <input className="input font-mono uppercase" value={editing.checkinCode ?? ""} onChange={(e) => setEditing({ ...editing, checkinCode: e.target.value.toUpperCase() })} placeholder="RD3-XXXX" required />
              </div>
            </div>
            <div>
              <label className="label">Fasilitas (pisahkan koma)</label>
              <input className="input" value={(editing.facilities ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, facilities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Whiteboard, Layar TV, AC" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              Ruang aktif (bisa dibooking)
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditing(null)}>Batal</button>
              <button className="btn-primary flex-1">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* ATURAN */}
      {rules && (
        <form onSubmit={saveRules} className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-lg font-bold text-slate-900">Aturan booking</h2>
            <div className="mt-4 space-y-3">
              {RULE_FIELDS.map((f) => (
                <div key={f.k} className="grid grid-cols-[1fr_6rem] items-center gap-3">
                  <label className="text-sm text-slate-700">{f.label} <span className="text-xs text-slate-400">({f.suffix})</span></label>
                  {f.k === "slotMinutes" ? (
                    <select className="input" value={rules.slotMinutes} onChange={(e) => setRules({ ...rules, slotMinutes: Number(e.target.value) })}>
                      {[15, 30, 60].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  ) : (
                    <input type="number" className="input" value={rules[f.k]} onChange={(e) => setRules({ ...rules, [f.k]: Number(e.target.value) })} />
                  )}
                </div>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="text-lg font-bold text-slate-900">Jam layanan perpustakaan</h2>
            <div className="mt-4 space-y-2">
              {DAYS.map((d) => {
                const h = rules.hours[d] ?? { open: null, close: null };
                const closed = !h.open;
                const setH = (v: { open: string | null; close: string | null }) => setRules({ ...rules, hours: { ...rules.hours, [d]: v } });
                return (
                  <div key={d} className="grid grid-cols-[5rem_auto_1fr_1fr] items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{DAY_NAME[d]}</span>
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input type="checkbox" className="accent-brand-600" checked={!closed} onChange={(e) => setH(e.target.checked ? { open: "08:00", close: "17:00" } : { open: null, close: null })} />
                      Buka
                    </label>
                    <input type="time" className="input px-2 py-1.5" disabled={closed} value={h.open ?? ""} onChange={(e) => setH({ ...h, open: e.target.value })} />
                    <input type="time" className="input px-2 py-1.5" disabled={closed} value={h.close ?? ""} onChange={(e) => setH({ ...h, close: e.target.value })} />
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-400">Default mengikuti website IT Del: Senin–Jumat 08.00–21.45, Sabtu 08.00–12.00 WIB.</p>
          </section>
          <div className="lg:col-span-2">
            <button className="btn-primary px-6 py-3">Simpan aturan & jam</button>
          </div>
        </form>
      )}
    </div>
  );
}
