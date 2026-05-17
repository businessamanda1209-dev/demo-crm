import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LibaAiView from "./LibaAiView";

export const dynamic = "force-dynamic";

export default async function LibaAiPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  let conversations: any[] = [];
  try {
    conversations = await (prisma as any).aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
  } catch (e) {
    console.error("[liba ai page]", e);
  }

  return <LibaAiView initialConversations={conversations} />;
}
