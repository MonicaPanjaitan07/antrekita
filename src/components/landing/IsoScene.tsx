"use client";

// Ilustrasi isometrik Perpustakaan IT Del (SVG murni, tanpa gambar eksternal).
// "Kamera" bergerak (zoom/geser) sesuai langkah cerita; garis rute tergambar perlahan
// dan karakter mahasiswa berjalan dari asrama sampai ke ruang diskusi.

import { useMemo } from "react";

const T = 34; // ukuran 1 petak (px)
const C = Math.cos(Math.PI / 6);
const OX = 620;
const OY = 90;
export const SCENE_W = 1480;
export const SCENE_H = 900;

type Pt = [number, number];
const iso = (x: number, y: number, z = 0): Pt => [(x - y) * C * T + OX, (x + y) * 0.5 * T - z * T + OY];
const pts = (a: Pt[]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

type Faces = { t: string; l: string; r: string };
function Box({ x, y, w, d, h, z = 0, c, op = 1 }: { x: number; y: number; w: number; d: number; h: number; z?: number; c: Faces; op?: number }) {
  const z1 = z + h;
  return (
    <g opacity={op}>
      <polygon points={pts([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z1), iso(x + w, y, z1)])} fill={c.r} />
      <polygon points={pts([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z1), iso(x, y + d, z1)])} fill={c.l} />
      <polygon points={pts([iso(x, y, z1), iso(x + w, y, z1), iso(x + w, y + d, z1), iso(x, y + d, z1)])} fill={c.t} />
    </g>
  );
}

function Floor({ x, y, w, d, z = 0, fill, stroke }: { x: number; y: number; w: number; d: number; z?: number; fill: string; stroke?: string }) {
  return <polygon points={pts([iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)])} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.5 : 0} />;
}

const WOOD: Faces = { t: "#f2e3cc", l: "#e2cba8", r: "#d5bb94" };
const WALL: Faces = { t: "#ffffff", l: "#eef1f6", r: "#e1e6ee" };
const GLASS1: Faces = { t: "#dbe8ff", l: "#bcd6ff", r: "#a9c8ff" };
const GLASS2: Faces = { t: "#d4f7ec", l: "#a7f3dd", r: "#8be9cd" };
const DARK: Faces = { t: "#334155", l: "#1e293b", r: "#0f172a" };
const SEAT: Faces = { t: "#bcd6ff", l: "#8ebcff", r: "#5996fd" };
const SEAT2: Faces = { t: "#a7f3dd", l: "#6ee7c6", r: "#34d3aa" };

function Shelf({ x, y, w }: { x: number; y: number; w: number }) {
  const d = 0.6,
    h = 1.7;
  const books = ["#3371f8", "#f59e0b", "#10b992", "#ef4444", "#8b5cf6", "#0ea5e9", "#f97316"];
  const strips = [];
  const n = Math.floor(w / 0.32);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < n; i++) {
      const bx = x + 0.08 + i * 0.32,
        z0 = 0.15 + row * 0.52;
      const hh = 0.32 + ((i * 7 + row * 3) % 4) * 0.035;
      strips.push(
        <polygon
          key={`${row}-${i}`}
          points={pts([iso(bx, y + d + 0.01, z0), iso(bx + 0.25, y + d + 0.01, z0), iso(bx + 0.25, y + d + 0.01, z0 + hh), iso(bx, y + d + 0.01, z0 + hh)])}
          fill={books[(i + row * 2) % books.length]}
          opacity={0.9}
        />,
      );
    }
  }
  return (
    <g>
      <Box x={x} y={y} w={w} d={d} h={h} c={WOOD} />
      {strips}
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const [px, py] = iso(x, y, 0);
  return (
    <g className="ak-sway" style={{ transformOrigin: `${px}px ${py}px` }}>
      <ellipse cx={px} cy={py + 2} rx={16 * s} ry={7 * s} fill="#0f172a" opacity={0.08} />
      <rect x={px - 3 * s} y={py - 26 * s} width={6 * s} height={26 * s} rx={2} fill="#b08968" />
      <circle cx={px} cy={py - 38 * s} r={20 * s} fill="#34d3aa" />
      <circle cx={px - 9 * s} cy={py - 30 * s} r={13 * s} fill="#10b992" />
      <circle cx={px + 8 * s} cy={py - 46 * s} r={11 * s} fill="#6ee7c6" />
    </g>
  );
}

function Person({ at, shirt, z = 0.32, phone, sit, bob, label }: { at: Pt; shirt: string; z?: number; phone?: boolean; sit?: boolean; bob?: boolean; label?: string }) {
  const [px, py] = iso(at[0], at[1], z);
  const h = sit ? 22 : 30;
  return (
    <g style={{ transform: `translate(${px}px, ${py}px)`, transition: "transform 1.3s cubic-bezier(.22,.9,.24,1)" }}>
      <g className={bob ? "ak-bob" : undefined}>
        <ellipse cx={0} cy={2} rx={11} ry={5} fill="#0f172a" opacity={0.15} />
        <rect x={-7} y={-h + 4} width={14} height={h - 8} rx={6} fill={shirt} />
        <rect x={-6} y={-6} width={5} height={8} rx={2} fill="#1e293b" opacity={sit ? 0 : 1} />
        <rect x={1} y={-6} width={5} height={8} rx={2} fill="#1e293b" opacity={sit ? 0 : 1} />
        <circle cx={0} cy={-h - 3} r={7.5} fill="#f1c7a3" />
        <path d={`M-7.5 ${-h - 4} a7.5 7.5 0 0 1 15 0 q-7 -4 -15 0z`} fill="#1e293b" />
        {phone && <rect x={5} y={-h + 6} width={6} height={10} rx={1.5} fill="#0f172a" stroke="#93c5fd" strokeWidth={1} />}
      </g>
      {label && (
        <g transform={`translate(0 ${-h - 24})`}>
          <rect x={-label.length * 3.4 - 8} y={-11} width={label.length * 6.8 + 16} height={20} rx={10} fill="#0f172a" />
          <text x={0} y={3} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#fff" fontFamily="inherit">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function Sign({ at, z, text, dark, w }: { at: Pt; z: number; text: string; dark?: boolean; w?: number }) {
  const [px, py] = iso(at[0], at[1], z);
  const width = w ?? text.length * 6.6 + 18;
  return (
    <g transform={`translate(${px} ${py})`}>
      <rect x={-width / 2} y={-12} width={width} height={24} rx={6} fill={dark ? "#0f172a" : "#ffffff"} stroke={dark ? "none" : "#e2e8f0"} />
      <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={800} letterSpacing={0.5} fill={dark ? "#fbbf24" : "#153ed9"} fontFamily="inherit">
        {text}
      </text>
    </g>
  );
}

// Rute mahasiswa (koordinat petak)
const ROUTE: Pt[] = [
  [3.2, 6.8],
  [4.2, 9.6],
  [6.6, 8.4],
  [8.6, 8.2],
  [11.2, 9.6],
  [12.4, 12.2],
  [14.4, 12.6],
];
// Posisi mahasiswa & panjang rute per langkah (0 = gambaran umum)
const STEP_POS: Pt[] = [[3.2, 6.8], [3.2, 6.8], [4.2, 9.6], [7.6, 8.3], [12.3, 12.1], [14.6, 12.9], [14.6, 12.9]];
const STEP_LEN = [0, 0.04, 0.2, 0.45, 0.82, 1, 1];
// Fokus kamera: [x, y, zoom]
const CAM: [number, number, number][] = [
  [13, 8.6, 1],
  [3.4, 6.2, 1.85],
  [4.6, 9.2, 1.85],
  [7.6, 8, 1.7],
  [12.8, 11.6, 1.9],
  [16.2, 12.2, 1.75],
  [10.6, 3.4, 1.85],
];

export function IsoScene({ step = 0, className = "" }: { step?: number; className?: string }) {
  const s = Math.max(0, Math.min(step, CAM.length - 1));
  const [fx, fy, zoom] = CAM[s];
  const [cx, cy] = iso(fx, fy, 0);
  const route = useMemo(() => {
    const p = ROUTE.map((q) => iso(q[0], q[1], 0.33));
    return "M" + p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L");
  }, []);

  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustrasi isometrik Perpustakaan IT Del">
      <defs>
        <radialGradient id="ak-vignette" cx="50%" cy="45%" r="70%">
          <stop offset="0.55" stopColor="#f6f8fc" stopOpacity="0" />
          <stop offset="1" stopColor="#eef2f8" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width={SCENE_W} height={SCENE_H} fill="#f6f8fc" />
      <g
        style={{
          transform: `translate(${SCENE_W / 2}px, ${SCENE_H / 2}px) scale(${zoom}) translate(${-cx}px, ${-cy}px)`,
          transition: "transform 1.3s cubic-bezier(.22,.9,.24,1)",
        }}
      >
        {/* Tanah & taman */}
        <Floor x={-3} y={-3} w={32} d={25} fill="#eef2f7" />
        <Floor x={-1} y={0} w={7} d={17} fill="#e3f4ec" />
        <Floor x={5.6} y={7.4} w={1.6} d={1.6} fill="#dfe6ef" />
        {/* Asrama */}
        <Box x={-0.4} y={0.6} w={4.2} d={3.6} h={3.2} c={{ t: "#e9eef7", l: "#cdd8ea", r: "#b8c7df" }} />
        {[0.7, 1.7, 2.7].map((zz) =>
          [0.4, 1.4, 2.4, 3.2].map((xx) => <polygon key={`${zz}-${xx}`} points={pts([iso(xx, 4.21, zz), iso(xx + 0.5, 4.21, zz), iso(xx + 0.5, 4.21, zz + 0.55), iso(xx, 4.21, zz + 0.55)])} fill="#93b4f0" />),
        )}
        <Sign at={[1.7, 2.4]} z={3.9} text="ASRAMA" />
        {/* Bangku taman */}
        <Box x={3.4} y={10.1} w={1.8} d={0.5} h={0.4} c={WOOD} />
        {/* Lantai perpustakaan */}
        <Box x={7} y={1} w={19} d={15} h={0.3} c={{ t: "#fbfaf8", l: "#e6e1d8", r: "#d9d2c6" }} />
        {/* Dinding belakang & kiri (bergaya potongan) */}
        <Box x={7} y={1} w={19} d={0.3} h={2.4} z={0.3} c={WALL} />
        <Box x={7} y={1} w={0.3} d={6.4} h={2.4} z={0.3} c={WALL} />
        <Box x={7} y={9.6} w={0.3} d={6.4} h={2.4} z={0.3} c={WALL} />
        <Sign at={[16.5, 1.1]} z={3.2} text="PERPUSTAKAAN IT DEL" dark w={190} />
        {/* Rak buku */}
        <Shelf x={17.4} y={2.2} w={7.6} />
        <Shelf x={17.4} y={4.3} w={7.6} />
        <Shelf x={17.4} y={6.4} w={7.6} />
        {/* Meja petugas */}
        <Box x={9.2} y={2.6} w={3.6} d={1} h={0.8} z={0.3} c={WOOD} />
        <Box x={10.2} y={2.7} w={1} d={0.12} h={0.65} z={1.1} c={DARK} />
        <Sign at={[11, 2.4]} z={2.55} text="PETUGAS" />
        <Person at={[10.9, 2.1]} shirt="#059677" bob label={s === 6 ? "Petugas" : undefined} />
        {/* Meja baca */}
        <Box x={10.6} y={5.6} w={2.6} d={1.2} h={0.6} z={0.3} c={WOOD} />
        <Box x={13.8} y={5.6} w={2.6} d={1.2} h={0.6} z={0.3} c={WOOD} />
        <Person at={[11.2, 5.2]} shirt="#f59e0b" sit z={0.62} />
        <Person at={[15.2, 7.2]} shirt="#8b5cf6" sit z={0.62} />
        {/* Ruang Diskusi 1 & 2 */}
        <Floor x={13} y={10} w={6} d={5.6} z={0.31} fill="#e8f0ff" />
        <Floor x={19.6} y={10} w={6} d={5.6} z={0.31} fill="#e3f8f1" />
        {/* Rute */}
        <path d={route} fill="none" stroke="#bcd6ff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
        <path
          d={route}
          pathLength={1}
          fill="none"
          stroke="#1d52ed"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 1"
          style={{ strokeDashoffset: 1 - STEP_LEN[s], transition: "stroke-dashoffset 1.3s cubic-bezier(.22,.9,.24,1)" }}
        />
        <Box x={13} y={10} w={6} d={0.14} h={2} z={0.3} c={GLASS1} op={0.75} />
        <Box x={13} y={10} w={0.14} d={1.6} h={2} z={0.3} c={GLASS1} op={0.75} />
        <Box x={13} y={13.2} w={0.14} d={2.4} h={2} z={0.3} c={GLASS1} op={0.75} />
        <Box x={19.6} y={10} w={6} d={0.14} h={2} z={0.3} c={GLASS2} op={0.75} />
        <Box x={19.6} y={10} w={0.14} d={5.6} h={2} z={0.3} c={GLASS2} op={0.75} />
        {/* Whiteboard */}
        <polygon points={pts([iso(14.6, 10.15, 1.0), iso(17.2, 10.15, 1.0), iso(17.2, 10.15, 1.9), iso(14.6, 10.15, 1.9)])} fill="#ffffff" stroke="#cbd5e1" />
        {/* Meja diskusi + kursi */}
        <Box x={14.8} y={11.6} w={2.8} d={1.6} h={0.65} z={0.3} c={WOOD} />
        {[[14.3, 11.8], [14.3, 12.6], [18, 11.8], [18, 12.6]].map(([xx, yy], i) => (
          <Box key={i} x={xx} y={yy} w={0.4} d={0.4} h={0.32} z={0.3} c={SEAT} />
        ))}
        <Box x={21.4} y={11.6} w={2.8} d={1.6} h={0.65} z={0.3} c={WOOD} />
        {[[20.9, 11.8], [20.9, 12.6], [24.6, 11.8], [24.6, 12.6]].map(([xx, yy], i) => (
          <Box key={i} x={xx} y={yy} w={0.4} d={0.4} h={0.32} z={0.3} c={SEAT2} />
        ))}
        <Person at={[17.9, 11.3]} shirt="#f97316" sit z={0.75} />
        <Person at={[16.2, 13.9]} shirt="#ef4444" sit z={0.75} />
        <Person at={[22.4, 13.9]} shirt="#0ea5e9" sit z={0.75} />
        <Person at={[24.2, 11.2]} shirt="#a855f7" sit z={0.75} />
        {/* Kode check-in di pintu */}
        <Sign at={[13.2, 10.6]} z={2.9} text="RD1-TOBA" dark />
        <Sign at={[16, 10.1]} z={2.7} text="RUANG DISKUSI 1" />
        <Sign at={[22.6, 10.1]} z={2.7} text="RUANG DISKUSI 2" />
        {/* Pohon */}
        <Tree x={0.4} y={6.4} />
        <Tree x={1} y={12.6} s={1.15} />
        <Tree x={5.4} y={14.6} />
        <Tree x={5.8} y={2.4} s={0.9} />
        <Tree x={27} y={4} s={1.1} />
        {/* Mahasiswa (tokoh utama) */}
        <Person at={STEP_POS[s]} shirt="#1d52ed" phone={s <= 3} sit={s >= 5} z={s >= 5 ? 0.75 : s <= 2 ? 0 : 0.32} label={s >= 1 && s <= 5 ? "Kamu" : undefined} />
      </g>
      <rect width={SCENE_W} height={SCENE_H} fill="url(#ak-vignette)" pointerEvents="none" />
    </svg>
  );
}
