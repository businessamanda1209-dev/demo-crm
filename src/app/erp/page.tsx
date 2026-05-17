import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ErpDashboardView from "./ErpDashboardView";

export const dynamic = "force-dynamic";

export default async function ErpPage() {
  const user = await requireUser();
  const userId = user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    payables,
    receivables,
    accounts,
  ] = await Promise.all([
    prisma.payable.findMany({ where: { userId }, select: { amount: true, status: true, dueDate: true } }).catch(() => []),
    prisma.receivable.findMany({ where: { userId }, select: { amount: true, status: true, dueDate: true } }).catch(() => []),
    prisma.financialAccount.findMany({ where: { userId, active: true }, select: { id: true, name: true, type: true, balance: true } }).catch(() => []),
  ]);

  const sum = (arr: { amount: unknown }[]) =>
    arr.reduce((s, r) => s + Number(r.amount), 0);

  const totalReceivable = sum(receivables.filter((r) => r.status !== "RECEIVED"));
  const totalPayable = sum(payables.filter((p) => p.status !== "PAID"));
  const overdueReceivable = sum(receivables.filter((r) => r.status === "OVERDUE" || (r.status === "OPEN" && new Date(r.dueDate) < today)));
  const overduePayable = sum(payables.filter((p) => p.status === "OVERDUE" || (p.status === "OPEN" && new Date(p.dueDate) < today)));
  const todayReceivable = sum(receivables.filter((r) => { const d = new Date(r.dueDate); return d >= today && d < tomorrow && r.status !== "RECEIVED"; }));
  const todayPayable = sum(payables.filter((p) => { const d = new Date(p.dueDate); return d >= today && d < tomorrow && p.status !== "PAID"; }));

  // Last 7 days cash flow
  const cashFlow = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const income = sum(receivables.filter((r) => { const rd = new Date(r.dueDate); return rd >= d && rd < next; }));
    const expense = sum(payables.filter((p) => { const pd = new Date(p.dueDate); return pd >= d && pd < next; }));
    return { label, income, expense };
  });

  return (
    <ErpDashboardView
      totalReceivable={totalReceivable}
      totalPayable={totalPayable}
      overdueReceivable={overdueReceivable}
      overduePayable={overduePayable}
      todayReceivable={todayReceivable}
      todayPayable={todayPayable}
      cashFlow={cashFlow}
      accounts={accounts.map((a) => ({ ...a, balance: Number(a.balance) }))}
    />
  );
}
