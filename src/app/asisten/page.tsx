import { aiEnabled } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { Chat } from "./Chat";

export const metadata = { title: "Asisten AI" };
export const dynamic = "force-dynamic";

export default async function AsistenPage() {
  const session = await getSession();
  return <Chat name={session?.name.split(" ")[0] ?? ""} enabled={aiEnabled()} />;
}
