import { aiEnabled } from "@/lib/ai";
import { Report } from "./Report";

export const metadata = { title: "Laporan Pemakaian" };
export const dynamic = "force-dynamic";

export default function LaporanPage() {
  return <Report enabled={aiEnabled()} />;
}
