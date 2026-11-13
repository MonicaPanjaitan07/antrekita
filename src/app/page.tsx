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
import { HeroSearch } from "@/components/landing/HeroSearch";
import { IsoScene } from "@/components/landing/IsoScene";
import { QR } from "@/components/landing/QR";
import { Reveal } from "@/components/landing/Reveal";
import { Story } from "@/components/landing/Story";
import { LogoMark } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { getAvailability, type Availability } from "@/lib/booking";
import { getRules, type Rules } from "@/lib/rules";
import { addDays, dayOfWeek, formatDateLong, formatDateShort, todayWIB, toMinutes, toWIBTime } from "@/lib/time";

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
  let rules: Rules | null = null;
  try {
    [av, rules] = await Promise.all([getAvailability(today, null), getRules()]);
  } catch {
    av = null;
  }
  const days = Array.from({ length: (rules?.maxAdvanceDays ?? 7) + 1 }, (_, i) => {
    const d = addDays(today, i);
    return { date: d, label: i === 0 ? `Hari ini, ${formatDateShort(d).split(", ")[1]}` : formatDateShort(d), closed: !rules?.hours[dayOfWeek(d)]?.open };
  });
  const roomCount = av?.rooms.length ?? 2;
  const freeNow = av?.rooms.filter((r) => r.freeNow).length ?? 0;

  return (
    <div className="overflow-x-clip bg-[#f6f8fc]">
      {/* ================= HERO ================= */}
      <section className="relative">
        <div className="container-app grid items-center gap-6 pb-10 pt-6 md:grid-cols-[1fr_1.1fr] md:pb-16 md:pt-12">
          <div className="order-2 md:order-1">
            <div className="ak-in text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">Perpustakaan Institut Teknologi Del · Laguboti</div>
            <h1 className="ak-in mt-3 text-[40px] font-extrabold leading-[1.02] tracking-tight text-slate-900 [animation-delay:80ms] sm:text-6xl">
              Ruang Diskusi,
              <br />
              <span className="text-brand-600">Tanpa Antre.</span>
            </h1>
            <p className="ak-in mt-5 max-w-md text-base leading-relaxed text-slate-600 [animation-delay:160ms]">
              Cek ruang kosong dan booking dari HP. Tidak perlu lagi jalan ke perpustakaan atau menulis di buku catatan. Ada asisten AI yang siap mencarikan slot.
            </p>
            <div className="ak-in [animation-delay:240ms]">
              <HeroSearch days={days} />
            </div>
            <div className="ak-in mt-7 grid max-w-md grid-cols-3 gap-4 [animation-delay:320ms]">
              {[
                [String(roomCount), "Ruang diskusi"],
                ["13 jam", "Layanan per hari"],
                ["0 menit", "Antre di meja"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="text-2xl font-extrabold text-slate-900">{v}</div>
                  <div className="text-xs text-slate-500">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative order-1 md:order-2">
            <div className="ak-in relative aspect-[4/3] overflow-hidden rounded-[28px] md:aspect-[5/4]">
              <IsoScene step={0} className="h-full w-full" />
            </div>
            {/* kartu melayang */}
            <div className="ak-float absolute -bottom-4 left-3 hidden rounded-2xl bg-slate-900 p-3 pr-4 text-white shadow-2xl sm:flex sm:items-center sm:gap-3 md:-left-6">
              <div className="rounded-lg bg-white p-1">
                <QR value="AK-AXBFE" size={44} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">E-tiket</div>
                <div className="text-lg font-extrabold tracking-wider">AK-AXBFE</div>
                <div className="text-[11px] text-slate-300">Ruang Diskusi 2 · 14:00</div>
              </div>
            </div>
            <div className="ak-float absolute right-3 top-3 rounded-2xl bg-white/95 px-3 py-2 shadow-xl [animation-delay:1.2s] md:-right-4 md:top-8">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lake-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lake-500" />
                </span>
                {av?.open ? `${freeNow} ruang kosong sekarang` : "Perpustakaan tutup hari ini"}
              </div>
            </div>
            <div className="ak-handwrite pointer-events-none absolute -bottom-9 right-6 hidden rotate-[-6deg] text-lg text-slate-500 md:block">tanpa antre, tanpa catat ✎</div>
          </div>
        </div>
        <div className="container-app pb-6 text-center">
          <a href="#cara-kerja" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-700">
            Scroll untuk lihat cara kerjanya <span className="ak-bob inline-block">↓</span>
          </a>
        </div>
      </section>

      {/* ================= CERITA SCROLL ================= */}
      <Story />

      {/* ================= STATUS LIVE ================= */}
      <section id="status" className="container-app scroll-mt-20 py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">Status saat ini · Live</div>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Setiap Detik
              <br />
              <span className="text-brand-600">Terpantau.</span>
            </h2>
            <p className="mt-4 max-w-md text-slate-600">
              Data diambil langsung dari database, bukan dari buku. Kalau ada yang tidak datang, slotnya otomatis dilepas dan langsung muncul sebagai kosong.
            </p>
            <Link href="/jadwal" className="btn-primary ak-press mt-6 px-5 py-3">
              Lihat jadwal lengkap <IconArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hari ini</div>
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
                {!av && <p className="text-sm text-slate-500">Data belum tersedia.</p>}
                {av && !av.open && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Perpustakaan tutup hari ini. Booking untuk hari lain tetap bisa dibuat.</div>}
                {av?.open &&
                  av.rooms.map((r) => {
                    const nf = nextFree(r);
                    const used = r.slots.filter((s) => s.state === "busy" || s.state === "mine").length;
                    const pct = r.slots.length ? Math.round((used / r.slots.length) * 100) : 0;
                    return (
                      <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.freeNow ? "bg-lake-500" : "bg-rose-400"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{r.name}</div>
                            <div className="text-xs text-slate-500">Kapasitas {r.capacity} orang · terisi {pct}% hari ini</div>
                          </div>
                          <div className="text-right text-xs">
                            {r.freeNow ? (
                              <span className="font-semibold text-lake-700">Kosong sekarang</span>
                            ) : nf ? (
                              <span className="text-slate-600">Kosong mulai <b className="text-slate-900">{nf}</b></span>
                            ) : (
                              <span className="text-slate-500">Penuh hari ini</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2.5 flex gap-[2px]">
                          {r.slots.map((s) => (
                            <span
                              key={s.start}
                              title={`${s.start} · ${s.state === "free" ? "kosong" : s.state === "past" ? "lewat" : "terisi"}`}
                              className={`h-2 flex-1 rounded-sm ${s.state === "free" ? "bg-lake-300" : s.state === "past" ? "bg-slate-200" : "bg-rose-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
              {rules && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                  <IconClock className="mt-px h-3.5 w-3.5 shrink-0" /> {shortHours(rules)}
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= ANTREAN DI GENGGAMAN ================= */}
      <section className="relative overflow-hidden bg-white py-16 md:py-24">
        <div className="container-app grid items-center gap-12 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <div className="relative mx-auto w-[260px]">
              <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-brand-200/60 to-lake-200/60 blur-3xl" />
              <div className="ak-float relative rounded-[42px] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
                <div className="overflow-hidden rounded-[32px] bg-[#f6f8fc]">
                  <div className="flex items-center justify-between px-5 pb-2 pt-3 text-[10px] font-semibold text-slate-500">
                    <span>09:41</span>
                    <span className="h-4 w-16 rounded-full bg-slate-900" />
                    <span>100%</span>
                  </div>
                  <div className="px-4 pb-5">
                    <div className="flex items-center gap-1.5">
                      <LogoMark className="h-6 w-6" />
                      <span className="text-sm font-extrabold">
                        Antre<span className="text-brand-600">Kita</span>
                      </span>
                    </div>
                    <div className="mt-3 rounded-2xl bg-slate-900 p-4 text-white">
                      <div className="text-[9px] uppercase tracking-widest text-slate-400">Booking aktif</div>
                      <div className="text-2xl font-extrabold tracking-wider">AK-AXBFE</div>
                      <div className="mt-0.5 text-[11px] text-slate-300">Ruang Diskusi 2 · Senin</div>
                      <div className="mt-3 h-1.5 rounded-full bg-white/15">
                        <div className="ak-grow h-1.5 w-2/3 rounded-full bg-amber-300" />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                        <span>14:00</span>
                        <span>16:00</span>
                      </div>
                    </div>
                    <div className="mt-3 grid place-items-center rounded-2xl bg-white p-3 shadow-sm">
                      <QR value="AK-AXBFE" size={96} />
                      <div className="mt-2 text-[10px] text-slate-500">Tunjukkan bila diminta petugas</div>
                    </div>
                    <div className="mt-3 rounded-xl bg-brand-600 py-2.5 text-center text-xs font-semibold text-white">Check-in di pintu ruang</div>
                  </div>
                </div>
              </div>
              <div className="ak-float absolute -right-16 bottom-16 hidden rounded-2xl bg-white p-3 shadow-xl [animation-delay:1.5s] sm:block">
                <div className="flex items-center gap-2 text-xs font-semibold text-lake-700">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-lake-100">
                    <IconCheck className="h-4 w-4" />
                  </span>
                  Check-in berhasil
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100} className="order-1 md:order-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">Aplikasi web · bisa dipasang di HP</div>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Antrean di
              <br />
              <span className="text-brand-600">Genggaman.</span>
            </h2>
            <p className="mt-4 max-w-md text-slate-600">Booking, lihat tiket, check-in, dan batalkan, semuanya dari HP. Riwayat pemakaian ruangmu juga tersimpan rapi.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={session ? "/saya" : "/daftar"} className="btn-primary ak-press px-5 py-3">
                {session ? "Booking saya" : "Daftar gratis"} <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link href={session ? "/asisten" : "/login?next=/asisten"} className="btn-secondary ak-press px-5 py-3">
                <IconChat className="h-4 w-4 text-brand-600" /> Tanya Asisten AI
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FITUR ================= */}
      <section className="container-app py-16 md:py-24">
        <Reveal>
          <div className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">Layanan unggulan</div>
          <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Dari buku catatan ke satu sistem.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: IconCalendar, tone: "bg-brand-50 text-brand-600", title: "Cek dari mana saja", text: "Jadwal setiap ruang tampil per 30 menit. Lihat slot kosong dari kelas, asrama, atau kantin." },
            { icon: IconChat, tone: "bg-lake-50 text-lake-600", title: "Asisten AI booking", text: "Ketik “ruang buat 5 orang besok jam 2”. AI mencarikan slot, kamu tinggal menekan konfirmasi." },
            { icon: IconScan, tone: "bg-amber-50 text-amber-600", title: "Digitalisasi buku lama", text: "Petugas memotret halaman buku booking, AI membacanya menjadi data. Arsip kertas tidak hilang lagi." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 120}>
              <div className="card h-full p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.tone}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="card h-full p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-600">
                <IconBook className="h-5 w-5" /> Sebelumnya: buku catatan
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                {["Harus datang ke perpustakaan untuk mengecek jadwal", "Nama & jam ditulis tangan di buku", "Jadwal bisa bentrok karena salah catat", "Buku bisa hilang, rusak, atau sulit direkap"].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <IconX className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="card h-full border-lake-200 bg-gradient-to-br from-white to-lake-50/60 p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-lake-700">
                <LogoMark className="h-5 w-5" /> Dengan AntreKita
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                {["Cek & booking dari HP, kapan saja", "Data tersimpan di database, bisa dicari & diekspor", "Sistem menolak jadwal bentrok secara otomatis", "Slot yang tidak dipakai (no-show) dilepas otomatis"].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-lake-600" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="container-app pb-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 px-6 py-12 text-center text-white md:py-16">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-lake-400/20 blur-3xl" />
            <h2 className="relative text-3xl font-extrabold tracking-tight md:text-5xl">
              Siap diskusi
              <span className="text-lake-300"> tanpa antre?</span>
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-brand-100">Book Easily, Manage Digitally.</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/jadwal" className="btn ak-press bg-white px-6 py-3 text-brand-800 hover:bg-brand-50 focus-visible:ring-white/40">
                <IconCalendar /> Cek ruang kosong
              </Link>
              {!session && (
                <Link href="/daftar" className="btn ak-press bg-white/10 px-6 py-3 text-white ring-1 ring-white/25 hover:bg-white/20 focus-visible:ring-white/30">
                  Daftar sekarang
                </Link>
              )}
            </div>
          </div>
        </Reveal>
        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <IconQr className="h-4 w-4" /> Dibuat untuk Perpustakaan Institut Teknologi Del · Laguboti, Toba
        </p>
      </section>
    </div>
  );
}
