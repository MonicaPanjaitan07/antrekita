import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { checkInByRoomCode } from "@/lib/booking";
import { json, route } from "@/lib/http";

const Body = z.object({ code: z.string().trim().min(3).max(40) });

export const POST = route(async (req) => {
  const s = await requireSession();
  const { code } = Body.parse(await req.json());
  return json({ booking: await checkInByRoomCode(code, s) });
});
