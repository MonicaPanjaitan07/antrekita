"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowRight, IconCalendar, IconUsers } from "../Icons";

export function HeroSearch({ days }: { days: { date: string; label: string; closed: boolean }[] }) {
  const router = useRouter();
  const first = days.find((d) => !d.closed)?.date ?? days[0]?.date;
  const [date, setDate] = useState(first);
  const [ppl, setPpl] = useState("4");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/jadwal?date=${date}`);
      }}
      className="mt-7 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-brand-900/5 sm:flex-row sm:items-center"
    >
      <label className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
        <IconCalendar className="h-5 w-5 shrink-0 text-brand-600" />
        <span className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal</span>
          <select value={date} onChange={(e) => setDate(e.target.value)} className="-ml-1 bg-transparent text-sm font-semibold text-slate-800 outline-none">
            {days.map((d) => (
              <option key={d.date} value={d.date} disabled={d.closed}>
                {d.label}
                {d.closed ? " (tutup)" : ""}
              </option>
            ))}
          </select>
        </span>
      </label>
      <div className="hidden h-9 w-px bg-slate-200 sm:block" />
      <label className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
        <IconUsers className="h-5 w-5 shrink-0 text-brand-600" />
        <span className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jumlah orang</span>
          <select value={ppl} onChange={(e) => setPpl(e.target.value)} className="-ml-1 bg-transparent text-sm font-semibold text-slate-800 outline-none">
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} orang
              </option>
            ))}
          </select>
        </span>
      </label>
      <button className="btn-primary ak-press px-5 py-3.5 sm:py-3">
        Cari slot <IconArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
