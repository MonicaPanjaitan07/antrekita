"use client";

import type { BookingDTO } from "@/lib/booking";
import { SOURCE_LABEL, STATUS_CLASS, STATUS_LABEL } from "@/lib/labels";
import { formatDateShort } from "@/lib/time";
import { IconClock, IconUsers } from "./Icons";

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_CLASS[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function BookingCard({
  b,
  actions,
  showContact,
}: {
  b: BookingDTO;
  actions?: React.ReactNode;
  showContact?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex w-full items-center gap-4 sm:w-auto">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <span className="text-[10px] font-semibold uppercase">{formatDateShort(b.date).split(", ")[0]}</span>
          <span className="text-lg font-extrabold leading-none">{Number(b.date.slice(8))}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">{b.roomName}</span>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-600">
            <span className="flex items-center gap-1"><IconClock className="h-4 w-4" /> {b.start}–{b.end}</span>
            <span className="flex items-center gap-1"><IconUsers className="h-4 w-4" /> {b.participants}</span>
            <span className="font-mono text-xs text-slate-400">{b.code}</span>
          </div>
          <div className="truncate text-sm text-slate-500">
            {showContact && <b className="text-slate-700">{b.contactName}{b.contactNim ? ` (${b.contactNim})` : ""} · </b>}
            {b.purpose}
            {showContact && <span className="text-xs text-slate-400"> · via {SOURCE_LABEL[b.source]}</span>}
          </div>
        </div>
      </div>
      {actions && <div className="flex shrink-0 gap-2 sm:ml-auto">{actions}</div>}
    </div>
  );
}
