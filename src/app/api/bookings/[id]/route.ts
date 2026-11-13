import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { cancelBooking, checkInBooking, completeBooking } from "@/lib/booking";
import { HttpError, json, route } from "@/lib/http";

const Body = z.object({
  action: z.enum(["cancel", "checkin", "complete"]),
  reason: z.string().max(200).optional(),
});

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const s = await requireSession();
  const { id } = await params;
  const { action, reason } = Body.parse(await req.json());
  if (action === "cancel") return json({ booking: await cancelBooking(id, s, reason) });
  if (action === "checkin") return json({ booking: await checkInBooking(id, s) });
  if (s.role !== "STAFF") throw new HttpError(403, "Hanya petugas yang bisa menandai selesai.");
  return json({ booking: await completeBooking(id) });
});
