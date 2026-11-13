import { aiEnabled } from "@/lib/ai";
import { Digitize } from "./Digitize";

export const metadata = { title: "Digitalisasi Buku Booking" };
export const dynamic = "force-dynamic";

export default function DigitalisasiPage() {
  return <Digitize enabled={aiEnabled()} />;
}
