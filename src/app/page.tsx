import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import DashboardView from "./DashboardView";

export const dynamic = "force-dynamic";

type DashboardData = [
  number,
  number,
  number,
  { value: unknown }[],
  {
    id: string;
    firstName: string;
    lastName: string;
    title: string | null;
    status: "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
    company: { name: string } | null;
  }[],
  {
    id: string;
    title: string;
    value: unknown;
    stage: string;
    expectedCloseDate: Date | null;
    closedAt: Date | null;
    company: { name: string } | null;
  }[],
];

export default async function DashboardPage() {
  const userId = await requireUserId();
  const fallback: DashboardData = [0, 0, 0, [], [], []];
  const [
    companyCount,
    contactCount,
    customerCount,
    openDeals,
    recentContacts,
    recentDeals,
  ] = await Promise.all([
    prisma.company.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.contact.count({ where: { userId, status: "CUSTOMER" } }),
    prisma.deal.findMany({
      where: { userId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
      select: { value: true },
    }),
    prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true },
    }),
    prisma.deal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true, contact: true },
    }),
  ]).catch(() => fallback);

  const pipelineValue = openDeals.reduce(
    (sum, d) => sum + Number(d.value),
    0,
  );

  const serializedRecentContacts = recentContacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    status: contact.status,
    company: contact.company ? { name: contact.company.name } : null,
  }));

  const serializedRecentDeals = recentDeals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    value: Number(deal.value),
    stage: deal.stage,
    expectedCloseDate: deal.expectedCloseDate?.toISOString() ?? null,
    closedAt: deal.closedAt?.toISOString() ?? null,
    company: deal.company ? { name: deal.company.name } : null,
  }));

  return (
    <DashboardView
      companyCount={companyCount}
      contactCount={contactCount}
      customerCount={customerCount}
      pipelineValue={pipelineValue}
      openDealCount={openDeals.length}
      recentContacts={serializedRecentContacts}
      recentDeals={serializedRecentDeals}
    />
  );
}
