import { getSession } from "@/lib/auth";
import { getRules } from "@/lib/rules";
import { addDays, dayOfWeek, isValidDate, todayWIB } from "@/lib/time";
import { Schedule } from "./Schedule";

export const metadata = { title: "Jadwal Ruang Diskusi" };
export const dynamic = "force-dynamic";

export default async function JadwalPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  const rules = await getRules();
  const today = todayWIB();
  const days = Array.from({ length: rules.maxAdvanceDays + 1 }, (_, i) => {
    const date = addDays(today, i);
    const h = rules.hours[dayOfWeek(date)];
    return { date, closed: !h?.open };
  });
  const initial =
    sp.date && isValidDate(sp.date) && days.some((d) => d.date === sp.date)
      ? sp.date
      : (days.find((d) => !d.closed)?.date ?? today);

  return (
    <Schedule
      days={days}
      initialDate={initial}
      role={session?.role ?? null}
      rules={{
        maxDurationMinutes: rules.maxDurationMinutes,
        minPeople: rules.minPeople,
        slotMinutes: rules.slotMinutes,
      }}
    />
  );
}
