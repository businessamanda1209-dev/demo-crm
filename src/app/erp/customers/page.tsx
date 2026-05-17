import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartiesView from "../_components/PartiesView";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireUser();
  const parties = await prisma.party.findMany({
    where: { userId: user.id, isCustomer: true },
    orderBy: { legalName: "asc" },
  }).catch(() => []);
  return <PartiesView initialParties={parties} role="customer" />;
}
