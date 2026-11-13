"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell, FormError } from "@/components/AuthShell";
import { api } from "@/lib/client";

const PRODI = [
  "S1 Informatika",
  "S1 Sistem Informasi",
  "S1 Teknik Elektro",
  "S1 Teknik Bioproses",
  "S1 Bioteknologi",
  "S1 Manajemen Rekayasa",
  "S1 Teknik Metalurgi",
  "D3 Teknologi Informasi",
  "D3 Teknologi Komputer",
  "D4 Teknologi Rekayasa Perangkat Lunak",
  "S2 Kecerdasan Buatan",
  "Lainnya",
];

export function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [form, setForm] = useState({ name: "", nim: "", email: "", prodi: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", json: form });
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/jadwal";
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      const e2 = err as Error & { details?: { fieldErrors?: Record<string, string[]> } };
      const first = e2.details?.fieldErrors && Object.values(e2.details.fieldErrors).flat()[0];
      setError(first || e2.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Buat akun mahasiswa"
      subtitle="Sekali daftar, booking ruang diskusi kapan saja."
      footer={
        <>
          Sudah punya akun? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Masuk</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Nama lengkap</label>
          <input id="name" className="input" value={form.name} onChange={set("name")} required autoComplete="name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="nim">NIM</label>
            <input id="nim" className="input uppercase" value={form.nim} onChange={set("nim")} required placeholder="11S22001" />
          </div>
          <div>
            <label className="label" htmlFor="prodi">Program studi</label>
            <select id="prodi" className="input" value={form.prodi} onChange={set("prodi")}>
              <option value="">Pilih…</option>
              {PRODI.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={form.email} onChange={set("email")} required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Kata sandi</label>
          <input id="password" type="password" className="input" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" placeholder="Minimal 8 karakter" />
        </div>
        <FormError message={error} />
        <button className="btn-primary w-full py-3" disabled={loading}>{loading ? "Mendaftarkan…" : "Daftar"}</button>
      </form>
    </AuthShell>
  );
}
