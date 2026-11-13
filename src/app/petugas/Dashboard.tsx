"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookingCard } from "@/components/BookingCard";
import { IconArrowRight, IconCalendar, IconChart, IconScan } from "@/components/Icons";
import type { BookingDTO } from "@/lib/booking";
import { api } from "@/lib/client";
import type { Stats } from "@/lib/stats";

export function Dashboard({ today, todayLabel }: { today: string; todayLabel: string }) {
  const [items, setItems] = useState<BookingDTO[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [b, s] = await Promise.all([
      api<{ items: BookingDTO[] }>(`/api/bookings?from=${today}&to=${today}&pageSize=200`),
      api<Stats>("/api/stats?days=30"),
    ]);
    setItems(b.items.sort((a, c) => a.start.localeCompare(c.start)));
    setStats(s);
  }, [today]);

  useEffect(() => {
    load().catch((e) => setMsg((e as Error).message));
    const t = setInterval(() => load().catch(() => {}), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function act(b: BookingDTO, action: "cancel" | "checkin" | "complete") {
    if (action === "cancel" && !confirm(`Batalkan booking ${b.code} atas nama ${b.contactName}?`)) return;
    setBusy(b.id);
    setMsg(null);
    try {
      await api(`/api/bookings/${b.id}`, { method: "PATCH", json: { action } });
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const count = (s: string) => items?.filter((b) => b.status === s).length ?? 0;
  const cards = [
    { label: "Booking hari ini", value: items ? items.filter((b) => b.status !== "CANCELLED").length : "–", tone: "text-brand-700" },
    { label: "Sedang dipakai", value: items ? count("CHECKED_IN") : "–", tone: "text-lake-700" },
    { label: "Menunggu check-in", value: items ? count("BOOKED") : "–", tone: "text-amber-600" },
    { label: "No-show 30 hari", value: stats ? `${stats.noShowRatePct}%` : "–", tone: "text-rose-600" },
  ];

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{todayLabel}</p>
          <h1 className="page-title">Dashboard petugas</h1>
        </div>
        <Link href="/jadwal" className="btn-primary"><IconCalendar className="h-4 w-4" /> Buat booking walk-in</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-xs font-semibold text-slate-500">{c.label}</div>
            <div className={`mt-1 text-3xl font-extrabold tabular-nums ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {msg && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{msg}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Jadwal hari ini</h2>
          <div className="mt-3 space-y-3">
            {!items && <div className="card h-24 animate-pulse bg-slate-100" />}
            {items?.length === 0 && <div className="card p-8 text-center text-slate-500">Belum ada booking hari ini.</div>}
            {items?.map((b) => (
              <BookingCard
                key={b.id}
                b={b}
                showContact
                actions={
                  b.status === "BOOKED" ? (
                    <>
                      <button className="btn-success px-3 py-2" disabled={busy === b.id} onClick={() => act(b, "checkin")}>Check-in</button>
                      <button className="btn-secondary px-3 py-2" disabled={busy === b.id} onClick={() => act(b, "cancel")}>Batal</button>
                    </>
                  ) : b.status === "CHECKED_IN" ? (
                    <button className="btn-secondary px-3 py-2" disabled={busy === b.id} onClick={() => act(b, "complete")}>Tandai selesai</button>
                  ) : null
                }
              />
            ))}
          </div>
        </section>

        <aside className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Pintasan</h2>
          {[
            { href: "/petugas/digitalisasi", icon: IconScan, title: "Digitalisasi buku", text: "Foto buku booking lama → data" },
            { href: "/petugas/laporan", icon: IconChart, title: "Laporan pemakaian", text: "Statistik + ringkasan AI" },
          ].map((s) => (
            <Link key={s.href} href={s.href} className="card flex items-center gap-3 p-4 transition hover:border-brand-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><s.icon /></div>
              <div className="flex-1">
                <div className="font-bold text-slate-900">{s.title}</div>
                <div className="text-xs text-slate-500">{s.text}</div>
              </div>
              <IconArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
          {stats && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-slate-500">30 hari terakhir</div>
              <div className="mt-2 space-y-2">
                {stats.byRoom.map((r) => {
                  const max = Math.max(...stats.byRoom.map((x) => x.n), 1);
                  return (
                    <div key={r.room}>
                      <div className="flex justify-between text-sm"><span className="font-medium text-slate-700">{r.room}</span><span className="tabular-nums text-slate-500">{r.n} booking · {r.hours} jam</span></div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.n / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
