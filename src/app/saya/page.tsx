"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookingCard } from "@/components/BookingCard";
import { IconCalendar, IconChat, IconQr } from "@/components/Icons";
import type { BookingDTO } from "@/lib/booking";
import { api } from "@/lib/client";

export default function MyBookingsPage() {
  const [items, setItems] = useState<BookingDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ items: BookingDTO[] }>("/api/bookings?pageSize=50");
      setItems(res.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(b: BookingDTO, action: "cancel" | "checkin") {
    if (action === "cancel" && !confirm(`Batalkan booking ${b.code}?`)) return;
    setBusy(b.id);
    setMsg(null);
    try {
      await api(`/api/bookings/${b.id}`, { method: "PATCH", json: { action } });
      setMsg(action === "cancel" ? "Booking dibatalkan. Slot kembali tersedia untuk orang lain." : "Check-in berhasil. Selamat berdiskusi!");
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const active = items?.filter((b) => b.status === "BOOKED" || b.status === "CHECKED_IN").reverse() ?? [];
  const history = items?.filter((b) => b.status !== "BOOKED" && b.status !== "CHECKED_IN") ?? [];

  return (
    <div className="container-app max-w-3xl py-6 sm:py-8">
      <h1 className="page-title">Booking saya</h1>
      <p className="mt-1 text-sm text-slate-500">Booking aktif, check-in, dan riwayat pemakaian ruangmu.</p>

      {msg && <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-100">{msg}</div>}
      {error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wider text-slate-400">Aktif</h2>
      <div className="mt-3 space-y-3">
        {!items && <div className="card h-24 animate-pulse bg-slate-100" />}
        {items && active.length === 0 && (
          <div className="card flex flex-col items-center p-8 text-center">
            <IconCalendar className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">Belum ada booking aktif</p>
            <div className="mt-4 flex gap-2">
              <Link href="/jadwal" className="btn-primary">Pilih dari jadwal</Link>
              <Link href="/asisten" className="btn-secondary"><IconChat className="h-4 w-4" /> Tanya AI</Link>
            </div>
          </div>
        )}
        {active.map((b) => (
          <BookingCard
            key={b.id}
            b={b}
            actions={
              b.status === "BOOKED" ? (
                <>
                  <Link href="/checkin" className="btn-success"><IconQr className="h-4 w-4" /> Check-in</Link>
                  <button className="btn-secondary" disabled={busy === b.id} onClick={() => act(b, "cancel")}>Batalkan</button>
                </>
              ) : (
                <span className="text-sm font-semibold text-lake-700">Sedang berlangsung</span>
              )
            }
          />
        ))}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-slate-400">Riwayat</h2>
          <div className="mt-3 space-y-3">
            {history.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        </>
      )}
    </div>
  );
}
