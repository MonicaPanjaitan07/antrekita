export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // Pintu ruang diskusi + gelombang danau: "masuk tanpa antre"
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ak-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3371f8" />
          <stop offset="1" stopColor="#153ed9" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#ak-g)" />
      <path d="M13 30V12.5A2.5 2.5 0 0 1 15.5 10h9a2.5 2.5 0 0 1 2.5 2.5V30" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="23" cy="20.5" r="1.6" fill="#6ee7c6" />
      <path d="M8 30.5c2.4 0 2.4-1.6 4.8-1.6s2.4 1.6 4.8 1.6 2.4-1.6 4.8-1.6 2.4 1.6 4.8 1.6 2.4-1.6 4.8-1.6" fill="none" stroke="#6ee7c6" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-slate-900">
        Antre<span className="text-brand-600">Kita</span>
      </span>
    </span>
  );
}
