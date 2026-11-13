"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconClock, IconQr, IconSparkle, IconUsers } from "../Icons";
import { IsoScene } from "./IsoScene";
import { QR } from "./QR";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-900/5 backdrop-blur ${className}`}>{children}</div>
);

function SlotRow({ label, states }: { label: string; states: string }) {
  const cls: Record<string, string> = {
    f: "bg-lake-50 text-lake-700 ring-lake-200",
    b: "bg-rose-50 text-rose-400 line-through ring-rose-100",
    s: "bg-brand-600 text-white ring-brand-300",
  };
  const t = ["13:00", "13:30", "14:00", "14:30"];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-slate-400">Sen, 16 Nov</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {t.map((x, i) => (
          <span key={x} className={`rounded-md py-1.5 text-center text-[11px] font-semibold ring-1 ${cls[states[i]]}`}>{x}</span>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  {
    tab: "Mahasiswa",
    eyebrow: "Langkah 1 · Dari asrama",
    t1: "Cek Jadwal,",
    t2: "Dari Mana Saja.",
    desc: "Buka AntreKita di HP. Jadwal tiap ruang diskusi tampil real-time per 30 menit, tanpa harus jalan ke perpustakaan.",
    card: (
      <Card className="space-y-3">
        <SlotRow label="Ruang Diskusi 1" states="ffbb" />
        <SlotRow label="Ruang Diskusi 2" states="bfff" />
      </Card>
    ),
  },
  {
    tab: "Pilih slot",
    eyebrow: "Langkah 2 · Pilih atau tanya AI",
    t1: "Pilih Slot,",
    t2: "Atau Tanya AI.",
    desc: "Ketuk slot kosong di kalender, atau ketik saja kebutuhanmu. Asisten AI mencarikan ruang yang pas lalu menyiapkan rencananya.",
    card: (
      <Card className="space-y-2.5">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3 py-2 text-xs text-white">Ruang buat 5 orang Senin jam 2, 2 jam</div>
        <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
          <IconSparkle className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-brand-600" />
          Ruang Diskusi 2 kosong 14:00–16:00. Siap dikonfirmasi?
        </div>
        <div className="rounded-xl bg-brand-600 py-2 text-center text-xs font-semibold text-white">Konfirmasi Booking</div>
      </Card>
    ),
  },
  {
    tab: "Tiket",
    eyebrow: "Langkah 3 · Booking terkonfirmasi",
    t1: "Dapat Tiket,",
    t2: "Tanpa Antre.",
    desc: "Booking langsung tersimpan di database dan kamu dapat e-tiket berkode unik. Jadwal bentrok otomatis ditolak sistem.",
    card: (
      <Card className="!bg-slate-900 !p-0 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px]">
          <span className="font-extrabold">
            Antre<span className="text-brand-300">Kita</span>
          </span>
          <span className="font-bold tracking-widest text-amber-300">E-TIKET</span>
        </div>
        <div className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Kode booking</div>
            <div className="text-2xl font-extrabold tracking-wider">AK-AXBFE</div>
            <div className="mt-1 text-xs leading-snug text-slate-300">Ruang Diskusi 2<br />Sen, 16 Nov · 14:00–16:00</div>
          </div>
          <div className="rounded-lg bg-white p-1.5">
            <QR value="AK-AXBFE" size={64} />
          </div>
        </div>
      </Card>
    ),
  },
  {
    tab: "Check-in",
    eyebrow: "Langkah 4 · Di depan ruangan",
    t1: "Check-in di",
    t2: "Pintu Ruang.",
    desc: "Masukkan atau scan kode yang tertempel di pintu. Ini membuktikan kamu benar-benar datang, jadi ruangan tidak dipesan kosong.",
    card: (
      <Card className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
          <IconQr className="h-5 w-5 text-slate-400" />
          <span className="font-mono text-sm font-bold tracking-[0.25em] text-slate-800">RD1-TOBA</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-lake-50 px-3 py-2.5 text-sm font-semibold text-lake-700">
          <IconCheck className="h-5 w-5" /> Check-in berhasil · sampai 16:00
        </div>
      </Card>
    ),
  },
  {
    tab: "Diskusi",
    eyebrow: "Langkah 5 · Ruang terpakai",
    t1: "Diskusi Tenang,",
    t2: "Slot Terjaga.",
    desc: "Ruangan aman untuk kelompokmu. Booking yang tidak check-in 15 menit setelah jam mulai otomatis dilepas untuk yang lain.",
    card: (
      <Card className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-800">Ruang Diskusi 2</span>
          <span className="badge bg-lake-50 text-lake-700 ring-1 ring-lake-200">Sedang dipakai</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="ak-grow h-2 w-[62%] rounded-full bg-gradient-to-r from-brand-500 to-lake-500" />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1"><IconClock className="h-3.5 w-3.5" /> 14:00–16:00</span>
          <span className="flex items-center gap-1"><IconUsers className="h-3.5 w-3.5" /> 5 orang</span>
        </div>
      </Card>
    ),
  },
  {
    tab: "Petugas",
    eyebrow: "Langkah 6 · Meja petugas",
    t1: "Petugas Pantau",
    t2: "Satu Layar.",
    desc: "Tidak ada lagi buku catatan. Petugas melihat jadwal hari ini, riwayat, dan laporan; buku lama pun didigitalisasi dengan AI.",
    card: (
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["44", "booking/30h", "text-brand-700"],
            ["2", "dipakai", "text-lake-700"],
            ["15%", "no-show", "text-rose-600"],
          ].map(([v, l, c]) => (
            <div key={l} className="rounded-xl bg-slate-50 py-2">
              <div className={`text-xl font-extrabold ${c}`}>{v}</div>
              <div className="text-[10px] text-slate-500">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex h-12 items-end gap-1">
          {[3, 5, 2, 6, 4, 7, 5, 8, 6, 9, 7, 6].map((h, i) => (
            <div key={i} className="ak-rise flex-1 rounded-t bg-brand-400" style={{ height: `${h * 10}%`, animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </Card>
    ),
  },
];

export function Story() {
  const ref = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const N = STEPS.length;

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        const p = Math.min(Math.max(-r.top / total, 0), 0.9999);
        setI(Math.floor(p * N));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [N]);

  const go = (k: number) => {
    const el = ref.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + (total * (k + 0.5)) / N, behavior: "smooth" });
  };

  return (
    <section ref={ref} id="cara-kerja" className="relative" style={{ height: `${N * 100}vh` }} aria-label="Cara kerja AntreKita">
      <div className="sticky top-16 h-[calc(100dvh-4rem)] overflow-hidden bg-[#f6f8fc]">
        {/* Ilustrasi */}
        <div className="absolute inset-x-0 top-0 h-[46%] md:inset-0 md:h-full">
          <IsoScene step={i + 1} className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#f6f8fc] via-[#f6f8fc]/85 to-transparent md:block md:w-[52%]" />

        {/* Teks + kartu */}
        <div className="absolute inset-x-0 bottom-14 top-[46%] md:inset-y-0 md:bottom-0 md:top-0">
          <div className="container-app relative h-full">
            {STEPS.map((s, k) => (
              <div
                key={s.tab}
                className={`absolute inset-x-4 top-4 transition-all duration-700 ease-out sm:inset-x-6 md:left-6 md:right-auto md:top-1/2 md:w-[400px] md:-translate-y-1/2 ${
                  k === i ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                style={{ transform: `${k === i ? "translateY(0)" : k < i ? "translateY(-24px)" : "translateY(24px)"}` }}
                aria-hidden={k !== i}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">{s.eyebrow}</div>
                <h3 className="mt-2 text-[28px] font-extrabold leading-[1.05] tracking-tight text-slate-900 md:text-[44px]">
                  {s.t1}
                  <br />
                  <span className="text-brand-600">{s.t2}</span>
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">{s.desc}</p>
                <div className="mt-4 md:mt-6">{s.card}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bilah langkah */}
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200/70 bg-white/80 backdrop-blur">
          <div className="container-app flex items-center gap-2 py-3">
            <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
              {STEPS.map((s, k) => (
                <button key={s.tab} onClick={() => go(k)} className="min-w-[72px] flex-1 text-left">
                  <div className="h-1 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-1 rounded-full bg-brand-600 transition-all duration-700 ${k <= i ? "w-full" : "w-0"}`} />
                  </div>
                  <div className={`mt-1.5 text-[11px] font-semibold ${k === i ? "text-slate-900" : "text-slate-400"}`}>
                    <span className="tabular-nums">{String(k + 1).padStart(2, "0")}</span> {s.tab}
                  </div>
                </button>
              ))}
            </div>
            <a href="#status" className="hidden shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-900 sm:block">
              Lewati ↓
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
