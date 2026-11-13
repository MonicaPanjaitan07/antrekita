"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  IconCalendar,
  IconChart,
  IconChat,
  IconDashboard,
  IconHistory,
  IconLogout,
  IconQr,
  IconScan,
  IconSettings,
  IconTicket,
} from "./Icons";
import { Logo } from "./Logo";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const STUDENT: Item[] = [
  { href: "/jadwal", label: "Jadwal", icon: IconCalendar },
  { href: "/asisten", label: "Asisten AI", icon: IconChat },
  { href: "/saya", label: "Booking Saya", icon: IconTicket },
  { href: "/checkin", label: "Check-in", icon: IconQr },
];

const STAFF: Item[] = [
  { href: "/petugas", label: "Dashboard", icon: IconDashboard },
  { href: "/jadwal", label: "Jadwal", icon: IconCalendar },
  { href: "/petugas/riwayat", label: "Riwayat", icon: IconHistory },
  { href: "/petugas/digitalisasi", label: "Digitalisasi", icon: IconScan },
  { href: "/petugas/laporan", label: "Laporan", icon: IconChart },
  { href: "/petugas/pengaturan", label: "Pengaturan", icon: IconSettings },
];

export function Nav({ session }: { session: { name: string; role: "STUDENT" | "STAFF" } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = session?.role === "STAFF" ? STAFF : session ? STUDENT : [];
  const isActive = (href: string) =>
    href === "/petugas" ? pathname === "/petugas" : pathname === href || pathname.startsWith(href + "/");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="container-app flex h-16 items-center gap-6">
          <Link href={session?.role === "STAFF" ? "/petugas" : "/"} aria-label="Beranda AntreKita">
            <Logo />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {(session ? items : [{ href: "/jadwal", label: "Cek Jadwal", icon: IconCalendar }]).map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(it.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold leading-tight text-slate-800">{session.name}</div>
                  <div className="text-xs text-slate-500">{session.role === "STAFF" ? "Petugas perpustakaan" : "Mahasiswa"}</div>
                </div>
                <button onClick={logout} className="btn-ghost px-2.5" title="Keluar" aria-label="Keluar">
                  <IconLogout />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">Masuk</Link>
                <Link href="/daftar" className="btn-primary">Daftar</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {session && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className={`grid ${items.length > 4 ? "grid-cols-5" : "grid-cols-4"}`}>
            {items.slice(0, 5).map((it) => {
              const active = isActive(it.href);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                    active ? "text-brand-600" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
