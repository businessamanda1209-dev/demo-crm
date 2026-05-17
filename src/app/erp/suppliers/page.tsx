import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartiesView from "../_components/PartiesView";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const user = await requireUser();
  const parties = await prisma.party.findMany({
    where: { userId: user.id, isSupplier: true },
    orderBy: { legalName: "asc" },
  }).catch(() => []);
  return <PartiesView initialParties={parties} role="supplier" />;
}
