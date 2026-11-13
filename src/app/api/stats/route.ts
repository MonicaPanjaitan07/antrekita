import { requireSession } from "@/lib/auth";
import { sweepStatuses } from "@/lib/booking";
import { json, route } from "@/lib/http";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireSession("STAFF");
  await sweepStatuses();
  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days") ?? 30), 7), 180);
  return json(await computeStats(days));
});
