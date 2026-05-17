import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReconciliationView from "./ReconciliationView";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const user = await requireUser();
  const accounts = await prisma.financialAccount
    .findMany({
      where: { userId: user.id, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    .catch(() => []);
  return <ReconciliationView accounts={accounts} />;
}
