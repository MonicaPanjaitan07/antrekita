"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR code yang dibuat di browser (tanpa layanan eksternal). */
export function QR({ value, size = 96, className = "" }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 0, width: size * 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [value, size]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`QR ${value}`} width={size} height={size} className={className} />
  ) : (
    <div style={{ width: size, height: size }} className={`animate-pulse rounded bg-slate-200 ${className}`} />
  );
}
