import Link from "next/link";
import { LogoMark } from "./Logo";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="container-app flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" aria-label="Beranda"><LogoMark className="h-12 w-12" /></Link>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="card p-6 sm:p-7">{children}</div>
        <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{message}</div>;
}
