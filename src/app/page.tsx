import Link from "next/link";
import {
  IconArrowRight,
  IconBook,
  IconCalendar,
  IconChat,
  IconCheck,
  IconClock,
  IconQr,
  IconScan,
  IconX,
} from "@/components/Icons";
import { LogoMark } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { getAvailability, type Availability } from "@/lib/booking";
import { getRules, type Rules } from "@/lib/rules";
import { formatDateLong, todayWIB, toMinutes, toWIBTime } from "@/lib/time";

export const dynamic = "force-dynamic";

/** "Sen–Jum 08:00–21:45 · Sab 08:00–12:00 · Min tutup" */
function shortHours(r: Rules) {
  const names = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const label = (d: number) => (r.hours[d]?.open ? `${r.hours[d].open}–${r.hours[d].close}` : "tutup");
  const groups: { from: number; to: number; text: string }[] = [];
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const last = groups.at(-1);
    if (last && last.text === label(d)) last.to = d;
    else groups.push({ from: d, to: d, text: label(d) });
  }
  return groups.map((g) => `${names[g.from]}${g.to !== g.from ? `–${names[g.to]}` : ""} ${g.text}`).join(" · ") + " WIB";
}

function nextFree(room: Availability["rooms"][number]) {
  const now = toMinutes(toWIBTime(new Date()));
  return room.slots.find((s) => s.state === "free" && toMinutes(s.end) > now)?.start ?? null;
}

export default async function Home() {
  const session = await getSession();
  const today = todayWIB();
  let av: Availability | null = null;
  let hoursText = "";
  try {
    av = await getAvailability(today, null);
    hoursText = shortHours(await getRules());
  } catch {
    av = null;
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-lake-400/20 blur-3xl" />
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-slate-50" viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40c120 0 120-24 240-24s120 24 240 24 120-24 240-24 120 24 240 24 120-24 240-24 120 24 240 24v24H0Z" fill="currentColor" />
        </svg>

        <div className="container-app relative grid gap-10 pb-24 pt-12 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="animate-rise">
            <span className="badge bg-white/10 text-brand-100 ring-1 ring-white/20">
              Perpustakaan Institut Teknologi Del · Laguboti
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Ruang diskusi kosong?
              <br />
              <span className="bg-gradient-to-r from-lake-300 to-brand-200 bg-clip-text text-transparent">Cek & booking dari HP.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
              Tidak perlu lagi jalan ke perpustakaan hanya untuk melihat buku catatan. AntreKita menampilkan jadwal ruang
              secara real-time, mencegah jadwal bentrok, dan punya asisten AI yang bisa diajak ngobrol untuk mencarikan slot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/jadwal" className="btn bg-white px-5 py-3 text-brand-800 hover:bg-brand-50 focus-visible:ring-white/40">
                <IconCalendar /> Cek ruang kosong
              </Link>
              <Link
                href={session ? "/asisten" : "/login?next=/asisten"}
                className="btn bg-white/10 px-5 py-3 text-white ring-1 ring-white/25 hover:bg-white/20 focus-visible:ring-white/30"
              >
                <IconChat /> Tanya Asisten AI
              </Link>
            </div>
            <p className="mt-6 text-sm text-brand-200">Book Easily, Manage Digitally.</p>
          </div>

          {/* Live status */}
          <div className="card animate-rise p-5 text-slate-800 [animation-delay:80ms] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status saat ini</div>
                <div className="font-bold text-slate-900">{formatDateLong(today)}</div>
              </div>
              <span className="badge bg-lake-50 text-lake-700 ring-1 ring-lake-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lake-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-lake-500" />
                </span>
                Live
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {!av && <p className="text-sm text-slate-500">Data belum tersedia. Pastikan database sudah disiapkan.</p>}
              {av && !av.open && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Perpustakaan tutup hari ini. Booking untuk hari lain tetap bisa dibuat.</div>
              )}
              {av?.open &&
                av.rooms.map((r) => {
                  const nf = nextFree(r);
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.freeNow ? "bg-lake-500" : "bg-rose-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{r.name}</div>
                        <div className="text-xs text-slate-500">Kapasitas {r.capacity} orang</div>
                      </div>
                      <div className="text-right text-xs">
                        {r.freeNow ? (
                          <span className="font-semibold text-lake-700">Kosong sekarang</span>
                        ) : nf ? (
                          <span className="text-slate-600">
                            Kosong mulai <b className="text-slate-900">{nf}</b>
                          </span>
                        ) : (
                          <span className="text-slate-500">Penuh hari ini</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            <Link href="/jadwal" className="btn-primary mt-4 w-full">
              Lihat jadwal lengkap <IconArrowRight className="h-4 w-4" />
            </Link>
            {hoursText && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                <IconClock className="mt-px h-3.5 w-3.5 shrink-0" /> {hoursText}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FITUR */}
      <section className="container-app py-14">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Dari buku catatan ke satu sistem</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-500">
          Tiga masalah lama di meja perpustakaan, diselesaikan dengan cara yang lebih praktis.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: IconCalendar,
              tone: "bg-brand-50 text-brand-600",
              title: "Cek dari mana saja",
              text: "Jadwal setiap ruang tampil per 30 menit. Lihat slot kosong dari kelas, asrama, atau kantin.",
            },
            {
              icon: IconChat,
              tone: "bg-lake-50 text-lake-600",
              title: "Asisten AI booking",
              text: "Ketik “ruang buat 5 orang besok jam 2”. AI mencarikan slot, kamu tinggal menekan konfirmasi.",
            },
            {
              icon: IconScan,
              tone: "bg-amber-50 text-amber-600",
              title: "Digitalisasi buku lama",
              text: "Petugas memotret halaman buku booking, AI membacanya menjadi data. Arsip kertas tidak hilang lagi.",
            },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.tone}`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEBELUM vs SESUDAH */}
      <section className="container-app pb-14">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-600">
              <IconBook className="h-5 w-5" /> Sebelumnya: buku catatan
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              {[
                "Harus datang ke perpustakaan untuk mengecek jadwal",
                "Nama & jam ditulis tangan di buku",
                "Jadwal bisa bentrok karena salah catat",
                "Buku bisa hilang, rusak, atau sulit direkap",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <IconX className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card border-lake-200 bg-gradient-to-br from-white to-lake-50/60 p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-lake-700">
              <LogoMark className="h-5 w-5" /> Dengan AntreKita
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
              {[
                "Cek & booking dari HP, kapan saja",
                "Data tersimpan di database, bisa dicari & diekspor",
                "Sistem menolak jadwal bentrok secara otomatis",
                "Slot yang tidak dipakai (no-show) dilepas otomatis",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-lake-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* LANGKAH */}
      <section className="container-app pb-16">
        <div className="card overflow-hidden">
          <div className="grid divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0">
            {[
              { n: "1", t: "Masuk dengan NIM", d: "Daftar sekali pakai NIM & email." },
              { n: "2", t: "Pilih slot", d: "Lewat kalender atau tanya asisten AI." },
              { n: "3", t: "Dapat kode booking", d: "Kode muncul di menu Booking Saya." },
              { n: "4", t: "Check-in di ruangan", d: "Masukkan kode yang tertempel di pintu ruang." },
            ].map((s) => (
              <div key={s.n} className="p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{s.n}</div>
                <div className="mt-3 font-bold text-slate-900">{s.t}</div>
                <div className="mt-1 text-sm text-slate-500">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          {!session && (
            <Link href="/daftar" className="btn-primary px-6 py-3">
              Daftar sekarang <IconArrowRight className="h-4 w-4" />
            </Link>
          )}
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <IconQr className="h-4 w-4" /> Dibuat untuk Perpustakaan Institut Teknologi Del · Laguboti, Toba
          </p>
        </div>
      </section>
    </div>
  );
}
