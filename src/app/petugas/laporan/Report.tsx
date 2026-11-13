"use client";

import { useEffect, useState } from "react";
import { IconSparkle } from "@/components/Icons";
import { api } from "@/lib/client";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { Stats } from "@/lib/stats";
import { formatDateShort } from "@/lib/time";

function Bars({ data, unit = "" }: { data: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(5.5rem,8.5rem)_1fr_2.5rem] items-center gap-2 text-sm">
          <span className="truncate text-slate-600">{d.label}</span>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="text-right font-semibold tabular-nums text-slate-700">{d.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

export function Report({ enabled }: { enabled: boolean }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStats(null);
    setSummary(null);
    api<Stats>(`/api/stats?days=${days}`).then(setStats).catch((e) => setError((e as Error).message));
  }, [days]);

  async function summarize() {
    setLoadingAi(true);
    setError(null);
    try {
      const res = await api<{ summary: string }>("/api/ai/report", { method: "POST", json: { days } });
      setSummary(res.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingAi(false);
    }
  }

  const maxDaily = stats ? Math.max(...stats.daily.map((d) => d.count), 1) : 1;

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Laporan pemakaian</h1>
          {stats && <p className="mt-1 text-sm text-slate-500">{formatDateShort(stats.period.from)} – {formatDateShort(stats.period.to)}</p>}
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${days === d ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {d} hari
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {!stats && !error && <div className="card mt-6 h-64 animate-pulse bg-slate-100" />}

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: "Total booking", v: stats.total },
              { l: "Selesai dipakai", v: stats.byStatus.COMPLETED ?? 0 },
              { l: "Tingkat no-show", v: `${stats.noShowRatePct}%` },
              { l: "Tingkat pembatalan", v: `${stats.cancelRatePct}%` },
            ].map((c) => (
              <div key={c.l} className="card p-4">
                <div className="text-xs font-semibold text-slate-500">{c.l}</div>
                <div className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{c.v}</div>
              </div>
            ))}
          </div>

          {/* Ringkasan AI */}
          <div className="card mt-5 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-brand-50 to-lake-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <IconSparkle className="h-5 w-5 text-brand-600" />
                <div>
                  <div className="font-bold text-slate-900">Ringkasan oleh AI</div>
                  <div className="text-xs text-slate-500">Angka dihitung dari database; AI hanya merangkum dalam kalimat.</div>
                </div>
              </div>
              <button className="btn-primary" disabled={!enabled || loadingAi} onClick={summarize}>
                {loadingAi ? "Merangkum…" : summary ? "Buat ulang" : "Buat ringkasan"}
              </button>
            </div>
            {(summary || !enabled) && (
              <div className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-slate-700">
                {summary ?? "AI belum aktif (GEMINI_API_KEY kosong)."}
              </div>
            )}
          </div>

          <div className="card mt-5 p-5">
            <h2 className="font-bold text-slate-900">Booking per hari</h2>
            <div className="mt-4 flex h-40 items-end gap-[3px]">
              {stats.daily.map((d) => (
                <div key={d.date} className="group relative flex-1">
                  <div className="w-full rounded-t bg-brand-400 transition group-hover:bg-brand-600" style={{ height: `${Math.max((d.count / maxDaily) * 150, d.count ? 4 : 1)}px` }} />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
                    {formatDateShort(d.date)}: {d.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="card p-5">
              <h2 className="font-bold text-slate-900">Per ruang</h2>
              <div className="mt-4"><Bars data={stats.byRoom.map((r) => ({ label: r.room, value: r.n }))} /></div>
              <p className="mt-3 text-xs text-slate-500">{stats.byRoom.map((r) => `${r.room}: ${r.hours} jam`).join(" · ")}</p>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-slate-900">Jam mulai terpopuler</h2>
              <div className="mt-4">
                <Bars data={[...stats.byHour].sort((a, b) => b.n - a.n).slice(0, 6).map((h) => ({ label: `${String(h.hour).padStart(2, "0")}:00`, value: h.n }))} />
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-slate-900">Per hari</h2>
              <div className="mt-4"><Bars data={stats.byWeekday.map((d) => ({ label: d.day, value: d.n }))} /></div>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-slate-900">Status</h2>
              <div className="mt-4"><Bars data={Object.entries(stats.byStatus).map(([k, v]) => ({ label: STATUS_LABEL[k] ?? k, value: v }))} /></div>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-slate-900">Sumber booking</h2>
              <div className="mt-4"><Bars data={Object.entries(stats.bySource).map(([k, v]) => ({ label: SOURCE_LABEL[k] ?? k, value: v }))} /></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
