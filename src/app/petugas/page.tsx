import { todayWIB, formatDateLong } from "@/lib/time";
import { Dashboard } from "./Dashboard";

export const metadata = { title: "Dashboard Petugas" };
export const dynamic = "force-dynamic";

export default function PetugasPage() {
  const today = todayWIB();
  return <Dashboard today={today} todayLabel={formatDateLong(today)} />;
}
