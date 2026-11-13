"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/BookingCard";
import { IconDownload } from "@/components/Icons";
import type { BookingDTO } from "@/lib/booking";
import { api } from "@/lib/client";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/labels";
import { formatDateShort } from "@/lib/time";

type Room = { id: string; name: string };

export default function RiwayatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [f, setF] = useState({ q: "", status: "", roomId: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: BookingDTO[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ rooms: Room[] }>("/api/admin/rooms").then((r) => setRooms(r.rooms)).catch(() => {});
  }, []);

  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/bookings?${qs}&page=${page}&pageSize=25`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [qs, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPage(1);
    setF((x) => ({ ...x, [k]: e.target.value }));
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Riwayat booking</h1>
          <p className="mt-1 text-sm text-slate-500">Cari berdasarkan nama, NIM, kode, atau keperluan. Ekspor ke CSV untuk arsip/cadangan.</p>
        </div>
        <a href={`/api/bookings/export?${qs}`} className="btn-secondary"><IconDownload className="h-4 w-4" /> Ekspor CSV</a>
      </div>

      <div className="card mt-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input lg:col-span-2" placeholder="Cari nama, NIM, kode…" value={f.q} onChange={set("q")} />
        <select className="input" value={f.status} onChange={set("status")}>
          <option value="">Semua status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" value={f.roomId} onChange={set("roomId")}>
          <option value="">Semua ruang</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" className="input px-2" value={f.from} onChange={set("from")} aria-label="Dari tanggal" />
          <input type="date" className="input px-2" value={f.to} onChange={set("to")} aria-label="Sampai tanggal" />
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Tanggal & jam</th>
              <th className="px-4 py-3">Ruang</th>
              <th className="px-4 py-3">Pemesan</th>
              <th className="px-4 py-3">Keperluan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sumber</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="font-semibold text-slate-800">{formatDateShort(b.date)}</div>
                  <div className="text-xs text-slate-500">{b.start}–{b.end} · <span className="font-mono">{b.code}</span></div>
                </td>
                <td className="px-4 py-3">{b.roomName}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{b.contactName}</div>
                  <div className="text-xs text-slate-500">{b.contactNim ?? "-"} · {b.participants} org</div>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">{b.purpose}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{SOURCE_LABEL[b.source]}</td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Tidak ada data yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>{data.total} booking</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
            <span className="tabular-nums">{page} / {pages}</span>
            <button className="btn-secondary px-3 py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
          </div>
        </div>
      )}
    </div>
  );
}
