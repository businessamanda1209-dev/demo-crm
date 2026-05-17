import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CostCentersView from "./CostCentersView";

export const dynamic = "force-dynamic";

export default async function CostCentersPage() {
  const user = await requireUser();
  const costCenters = await prisma.costCenter
    .findMany({ where: { userId: user.id }, orderBy: { code: "asc" } })
    .catch(() => []);
  return <CostCentersView initialCostCenters={costCenters} />;
}
