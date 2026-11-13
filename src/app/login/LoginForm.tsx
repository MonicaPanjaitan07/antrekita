"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell, FormError } from "@/components/AuthShell";
import { api } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ role: string }>("/api/auth/login", { method: "POST", json: { identifier, password } });
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.push(safeNext ?? (res.role === "STAFF" ? "/petugas" : "/jadwal"));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Masuk ke AntreKita"
      subtitle="Pakai NIM atau email yang kamu daftarkan."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href={`/daftar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600 hover:underline">
            Daftar
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="identifier">NIM atau email</label>
          <input id="identifier" className="input" autoComplete="username" placeholder="11S22001 atau nama@students.del.ac.id"
            value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Kata sandi</label>
          <input id="password" type="password" className="input" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <FormError message={error} />
        <button className="btn-primary w-full py-3" disabled={loading}>{loading ? "Memproses…" : "Masuk"}</button>
      </form>
    </AuthShell>
  );
}
