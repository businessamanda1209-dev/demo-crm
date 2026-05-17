import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PayablesView from "./PayablesView";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  const user = await requireUser();
  const [payables, parties, categories, accounts, costCenters] = await Promise.all([
    prisma.payable.findMany({
      where: { userId: user.id },
      include: {
        party: { select: { id: true, legalName: true, tradeName: true, document: true } },
        category: { select: { id: true, description: true } },
        account: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
      orderBy: { dueDate: "asc" },
    }).catch(() => []),
    prisma.party.findMany({ where: { userId: user.id, isSupplier: true, active: true }, select: { id: true, legalName: true, tradeName: true, document: true }, orderBy: { legalName: "asc" } }).catch(() => []),
    prisma.financialCategory.findMany({ where: { userId: user.id, type: "EXPENSE", active: true }, select: { id: true, description: true }, orderBy: { description: "asc" } }).catch(() => []),
    prisma.financialAccount.findMany({ where: { userId: user.id, canPay: true, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.costCenter.findMany({ where: { userId: user.id, active: true }, select: { id: true, name: true, code: true }, orderBy: { code: "asc" } }).catch(() => []),
  ]);

  const serialized = payables.map((p) => ({
    ...p,
    amount: Number(p.amount),
    competenceDate: p.competenceDate.toISOString(),
    dueDate: p.dueDate.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <PayablesView initialPayables={serialized} parties={parties} categories={categories} accounts={accounts} costCenters={costCenters} />;
}
