"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconDoor } from "@/components/Icons";
import type { BookingDTO } from "@/lib/booking";
import { api } from "@/lib/client";

export function CheckinForm({ initialCode = "", auto = false }: { initialCode?: string; auto?: boolean }) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BookingDTO | null>(null);
  const fired = useRef(false);

  async function submit(c = code) {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ booking: BookingDTO }>("/api/checkin", { method: "POST", json: { code: c } });
      setDone(res.booking);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (auto && initialCode && !fired.current) {
      fired.current = true;
      submit(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-app flex max-w-md flex-col items-center py-10 text-center">
      {done ? (
        <div className="card w-full animate-rise p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lake-100 text-lake-600">
            <IconCheck className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Check-in berhasil</h1>
          <p className="mt-2 text-slate-600">
            <b>{done.roomName}</b> sampai pukul <b>{done.end}</b>. Selamat berdiskusi!
          </p>
          <p className="mt-1 font-mono text-sm text-slate-400">{done.code}</p>
          <Link href="/saya" className="btn-primary mt-6 w-full">Lihat booking saya</Link>
        </div>
      ) : (
        <div className="card w-full p-7">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <IconDoor className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Check-in ruangan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masukkan kode yang tertempel di pintu ruang diskusi (atau scan QR-nya). Check-in membuktikan kamu benar-benar datang.
          </p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              className="input text-center font-mono text-lg uppercase tracking-widest"
              placeholder="RD1-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
            {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}
            <button className="btn-primary w-full py-3" disabled={loading || code.length < 3}>
              {loading ? "Memeriksa…" : "Check-in"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
