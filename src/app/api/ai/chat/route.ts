import { z } from "zod";
import { runChat } from "@/lib/ai";
import { requireSession } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const maxDuration = 60;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(30),
});

export const POST = route(async (req) => {
  const s = await requireSession();
  const { messages } = Body.parse(await req.json());
  // Hanya kirim 16 pesan terakhir supaya hemat token; pesan pertama harus dari user.
  let history = messages.slice(-16);
  while (history.length && history[0].role !== "user") history = history.slice(1);
  const result = await runChat(history, { uid: s.uid, role: s.role, name: s.name });
  return json(result);
});
