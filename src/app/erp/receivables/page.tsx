import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReceivablesView from "./ReceivablesView";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const user = await requireUser();
  const [receivables, parties, categories, accounts, costCenters] = await Promise.all([
    prisma.receivable.findMany({
      where: { userId: user.id },
      include: {
        party: { select: { id: true, legalName: true, tradeName: true } },
        category: { select: { id: true, description: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    }).catch(() => []),
    prisma.party.findMany({ where: { userId: user.id, isCustomer: true, active: true }, select: { id: true, legalName: true, tradeName: true, document: true }, orderBy: { legalName: "asc" } }).catch(() => []),
    prisma.financialCategory.findMany({ where: { userId: user.id, type: "REVENUE", active: true }, select: { id: true, description: true }, orderBy: { description: "asc" } }).catch(() => []),
    prisma.financialAccount.findMany({ where: { userId: user.id, canReceive: true, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.costCenter.findMany({ where: { userId: user.id, active: true }, select: { id: true, name: true, code: true }, orderBy: { code: "asc" } }).catch(() => []),
  ]);

  const serialized = receivables.map((r) => ({
    ...r,
    amount: Number(r.amount),
    competenceDate: r.competenceDate.toISOString(),
    dueDate: r.dueDate.toISOString(),
    receivedAt: r.receivedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return <ReceivablesView initialReceivables={serialized} parties={parties} categories={categories} accounts={accounts} costCenters={costCenters} />;
}
