"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconScan, IconSparkle, IconUpload, IconX } from "@/components/Icons";
import { api } from "@/lib/client";

type Room = { id: string; name: string };
type Row = {
  include: boolean;
  date: string;
  start: string;
  end: string;
  roomId: string;
  room?: string | null;
  name: string;
  nim: string;
  participants: string;
  purpose: string;
  confidence: number;
  note?: string | null;
  result?: { ok: boolean; code?: string; error?: string };
};

type Extracted = {
  date: string | null; start: string | null; end: string | null; room: string | null; roomId: string | null;
  name: string | null; nim: string | null; participants: number | null; purpose: string | null; confidence: number; note: string | null;
};

/** Perkecil foto di browser supaya cepat diunggah (maks. sisi 1800px, JPEG). */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type.includes("heic") || file.type.includes("heif")) return file;
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}

const empty = (): Row => ({ include: true, date: "", start: "", end: "", roomId: "", name: "", nim: "", participants: "", purpose: "", confidence: 1 });

export function Digitize({ enabled }: { enabled: boolean }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [defaultDate, setDefaultDate] = useState("");
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ rooms: Room[] }>("/api/admin/rooms").then((r) => setRooms(r.rooms)).catch(() => {});
  }, []);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setRows([]);
    setMsg(null);
  }

  async function extract() {
    if (!file) return;
    setLoading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      const blob = await shrink(file);
      fd.append("image", blob, blob === file ? file.name : "halaman.jpg");
      if (defaultDate) fd.append("defaultDate", defaultDate);
      const res = await api<{ rows: Extracted[] }>("/api/ai/logbook", { method: "POST", body: fd });
      setRows(
        res.rows.map((r) => ({
          include: true,
          date: r.date ?? "",
          start: r.start ?? "",
          end: r.end ?? "",
          roomId: r.roomId ?? "",
          room: r.room,
          name: r.name ?? "",
          nim: r.nim ?? "",
          participants: r.participants ? String(r.participants) : "",
          purpose: r.purpose ?? "",
          confidence: r.confidence,
          note: r.note,
        })),
      );
      if (!res.rows.length) setMsg({ tone: "err", text: "AI tidak menemukan baris booking di foto ini." });
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch, result: undefined } : r)));
  }

  async function save() {
    const chosen = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.include && !r.result?.ok);
    if (!chosen.length) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await api<{ saved: number; results: { index: number; ok: boolean; code?: string; error?: string }[] }>(
        "/api/logbook/save",
        {
          method: "POST",
          json: {
            label: label || undefined,
            rows: chosen.map(({ r }) => ({
              date: r.date, start: r.start, end: r.end, roomId: r.roomId, name: r.name,
              nim: r.nim || null, participants: r.participants, purpose: r.purpose || null,
            })),
          },
        },
      );
      setRows((rs) => rs.map((r, i) => {
        const k = chosen.findIndex((c) => c.i === i);
        return k >= 0 ? { ...r, result: res.results[k] } : r;
      }));
      setMsg({ tone: "ok", text: `${res.saved} dari ${chosen.length} baris tersimpan ke database.` });
    } catch (e) {
      const d = (e as { details?: { results?: { index: number; ok: boolean; error?: string }[] } }).details;
      if (d?.results) {
        setRows((rs) => rs.map((r, i) => {
          const k = chosen.findIndex((c) => c.i === i);
          return k >= 0 ? { ...r, result: d.results![k] } : r;
        }));
      }
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const pending = rows.filter((r) => r.include && !r.result?.ok).length;

  return (
    <div className="container-app py-6 sm:py-8">
      <h1 className="page-title">Digitalisasi buku booking</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Foto halaman buku catatan peminjaman ruang. AI membaca tulisan tangan menjadi tabel. Periksa dan perbaiki hasilnya,
        lalu simpan. Foto tidak disimpan di server.
      </p>

      <div className="mt-6 space-y-5">
        <div className="card grid gap-5 p-5 md:grid-cols-[280px_1fr]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Pratinjau halaman buku" className="h-full w-full object-contain" />
            ) : (
              <>
                <IconUpload className="h-9 w-9" />
                <span className="mt-2 text-sm font-semibold">Ambil / pilih foto halaman</span>
                <span className="text-xs">JPG, PNG, WEBP · maks. 4 MB</span>
              </>
            )}
          </button>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Tanggal default (opsional)</label>
                <input type="date" className="input" value={defaultDate} onChange={(e) => setDefaultDate(e.target.value)} />
                <p className="mt-1 text-xs text-slate-400">Dipakai bila tanggal tidak tertulis per baris.</p>
              </div>
              <div>
                <label className="label">Label arsip (opsional)</label>
                <input className="input" placeholder="mis. Buku 2026 hal. 12" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            </div>
            {!enabled && (
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                AI belum aktif (GEMINI_API_KEY kosong). Kamu tetap bisa mengetik baris secara manual.
              </div>
            )}
            <button className="btn-primary mt-auto w-full py-3 sm:w-auto sm:self-start sm:px-8" disabled={!enabled || !file || loading} onClick={extract}>
              <IconSparkle className="h-4 w-4" /> {loading ? "AI sedang membaca…" : "Baca dengan AI"}
            </button>
          </div>
        </div>

        <div className="card min-w-0 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-slate-900">Hasil untuk direview {rows.length > 0 && <span className="text-slate-400">({rows.length} baris)</span>}</h2>
            <div className="flex gap-2">
              <button className="btn-secondary px-3 py-2" onClick={() => setRows((r) => [...r, empty()])}>+ Baris manual</button>
              <button className="btn-success px-3 py-2" disabled={!pending || saving} onClick={save}>
                <IconCheck className="h-4 w-4" /> {saving ? "Menyimpan…" : `Simpan ${pending || ""}`}
              </button>
            </div>
          </div>

          {msg && (
            <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${msg.tone === "ok" ? "bg-lake-50 text-lake-800 ring-1 ring-lake-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
              {msg.text}
            </div>
          )}

          {rows.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-slate-400">
              <IconScan className="h-12 w-12" />
              <p className="mt-2 text-sm">Belum ada data. Unggah foto lalu tekan “Baca dengan AI”.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="w-8 pb-2" />
                    <th className="pb-2">Tanggal</th>
                    <th className="pb-2">Mulai</th>
                    <th className="pb-2">Selesai</th>
                    <th className="pb-2">Ruang</th>
                    <th className="pb-2">Nama</th>
                    <th className="pb-2">NIM</th>
                    <th className="pb-2">Org</th>
                    <th className="pb-2">Keperluan</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const low = r.confidence < 0.7;
                    const cellCls = `input px-2 py-1.5 text-xs ${low ? "border-amber-300 bg-amber-50/50" : ""}`;
                    return (
                      <tr key={i} className="align-top">
                        <td className="py-1.5 pr-1">
                          <input type="checkbox" className="mt-2 h-4 w-4 accent-brand-600" checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} />
                        </td>
                        <td className="py-1.5 pr-1"><input type="date" className={cellCls} value={r.date} onChange={(e) => update(i, { date: e.target.value })} /></td>
                        <td className="py-1.5 pr-1"><input type="time" className={`${cellCls} w-[6.5rem]`} value={r.start} onChange={(e) => update(i, { start: e.target.value })} /></td>
                        <td className="py-1.5 pr-1"><input type="time" className={`${cellCls} w-[6.5rem]`} value={r.end} onChange={(e) => update(i, { end: e.target.value })} /></td>
                        <td className="py-1.5 pr-1">
                          <select className={`${cellCls} min-w-[9.5rem]`} value={r.roomId} onChange={(e) => update(i, { roomId: e.target.value })}>
                            <option value="">{r.room ? `? ${r.room}` : "Pilih"}</option>
                            {rooms.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pr-1"><input className={cellCls} value={r.name} onChange={(e) => update(i, { name: e.target.value })} /></td>
                        <td className="py-1.5 pr-1"><input className={`${cellCls} w-24 uppercase`} value={r.nim} onChange={(e) => update(i, { nim: e.target.value })} /></td>
                        <td className="py-1.5 pr-1"><input type="number" min={1} className={`${cellCls} w-14`} value={r.participants} onChange={(e) => update(i, { participants: e.target.value })} /></td>
                        <td className="py-1.5 pr-1"><input className={cellCls} value={r.purpose} onChange={(e) => update(i, { purpose: e.target.value })} /></td>
                        <td className="py-1.5 text-xs">
                          {r.result ? (
                            r.result.ok ? (
                              <span className="badge bg-lake-50 text-lake-700">✓ {r.result.code}</span>
                            ) : (
                              <span className="text-rose-600">{r.result.error}</span>
                            )
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`badge ${low ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`} title={r.note ?? ""}>
                                {Math.round(r.confidence * 100)}%
                              </span>
                              <button className="text-slate-400 hover:text-rose-500" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Hapus baris">
                                <IconX className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                          {r.note && !r.result && <div className="mt-1 max-w-[140px] text-[11px] text-amber-600">{r.note}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate-400">
                Kolom kuning = AI kurang yakin, mohon dicek. Baris yang sudah lewat disimpan sebagai arsip “Selesai”; baris mendatang
                masuk jadwal dan tetap dicek agar tidak bentrok.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
