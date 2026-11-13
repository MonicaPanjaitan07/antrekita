import { getSession } from "@/lib/auth";
import { getAvailability } from "@/lib/booking";
import { HttpError, json, route } from "@/lib/http";
import { isValidDate, todayWIB } from "@/lib/time";

export const dynamic = "force-dynamic";

// Publik: siapa pun bisa melihat ketersediaan tanpa login (nama pemesan disembunyikan).
export const GET = route(async (req) => {
  const date = new URL(req.url).searchParams.get("date") ?? todayWIB();
  if (!isValidDate(date)) throw new HttpError(400, "Tanggal tidak valid.");
  const session = await getSession();
  return json(await getAvailability(date, session));
});
