import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AntreKita — Booking Ruang Diskusi Perpustakaan IT Del", template: "%s · AntreKita" },
  description:
    "Cek ketersediaan dan booking ruang diskusi Perpustakaan Institut Teknologi Del dari HP, dibantu asisten AI. Book Easily, Manage Digitally.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1d52ed",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="id">
      <body className="min-h-dvh">
        <Nav session={session ? { name: session.name, role: session.role } : null} />
        <main className={session ? "pb-24 md:pb-10" : "pb-10"}>{children}</main>
      </body>
    </html>
  );
}
