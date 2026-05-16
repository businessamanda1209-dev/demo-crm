import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import CompaniesView from "./CompaniesView";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const userId = await requireUserId();
  const companies = await prisma.company.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  }).catch(() => []);

  const serialized = companies.map((c) => ({
    ...c,
    annualRevenue: Number(c.annualRevenue),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return <CompaniesView initialCompanies={serialized} />;
}
