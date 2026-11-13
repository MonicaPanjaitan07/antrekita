import { z } from "zod";
import { summarizeReport } from "@/lib/ai";
import { requireSession } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { computeStats } from "@/lib/stats";

export const maxDuration = 60;

const Body = z.object({ days: z.coerce.number().int().min(7).max(180).default(30) });

export const POST = route(async (req) => {
  await requireSession("STAFF");
  const { days } = Body.parse(await req.json().catch(() => ({})));
  const stats = await computeStats(days);
  if (stats.total === 0) return json({ summary: "Belum ada data booking pada periode ini." });
  return json({ summary: await summarizeReport(stats) });
});
