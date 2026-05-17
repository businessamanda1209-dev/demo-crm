import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ErpDashboardView from "./ErpDashboardView";

export const dynamic = "force-dynamic";

export default async function ErpPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const userId = user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  // 6 months window
  const sixStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [payables, receivables, accounts] = await Promise.all([
    prisma.payable.findMany({
      where: { userId },
      select: { amount: true, status: true, dueDate: true, paidAt: true, recurrence: true },
    }).catch(() => [] as any[]),
    prisma.receivable.findMany({
      where: { userId },
      select: { amount: true, status: true, dueDate: true, receivedAt: true, recurrence: true },
    }).catch(() => [] as any[]),
    prisma.financialAccount.findMany({
      where: { userId, active: true },
      select: { id: true, name: true, type: true, balance: true },
    }).catch(() => [] as any[]),
  ]);

  const sum = (arr: { amount: unknown }[]) => arr.reduce((s, r) => s + Number(r.amount), 0);

  // ─── Summary cards ─────────────────────────────────────────
  const receitaLiquida = sum(
    receivables.filter((r) => {
      if (r.status !== "RECEIVED" || !r.receivedAt) return false;
      const d = new Date(r.receivedAt);
      return d >= monthStart && d < monthEnd;
    })
  );
  const despesasPagasMes = sum(
    payables.filter((p) => {
      if (p.status !== "PAID" || !p.paidAt) return false;
      const d = new Date(p.paidAt);
      return d >= monthStart && d < monthEnd;
    })
  );
  const lucroOperacional = receitaLiquida - despesasPagasMes;

  const inadimplencia = sum(
    receivables.filter((r) => r.status !== "RECEIVED" && new Date(r.dueDate) < today)
  );

  const custosFixos = sum(
    payables.filter((p) => {
      if (!p.recurrence) return false;
      const d = new Date(p.dueDate);
      return d >= monthStart && d < monthEnd;
    })
  );

  const aReceber = sum(receivables.filter((r) => r.status !== "RECEIVED"));
  const aPagar = sum(payables.filter((p) => p.status !== "PAID"));

  // ─── 6-month cash flow (Entradas = receivables.receivedAt, Saídas = payables.paidAt) ───
  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixStart.getFullYear(), sixStart.getMonth() + i, 1);
    months.push({
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  const cashFlow = months.map((m) => {
    const mStart = new Date(m.year, m.month, 1);
    const mEnd = new Date(m.year, m.month + 1, 1);
    const entradas = sum(
      receivables.filter((r) => {
        if (!r.receivedAt) return false;
        const d = new Date(r.receivedAt);
        return d >= mStart && d < mEnd;
      })
    );
    const saidas = sum(
      payables.filter((p) => {
        if (!p.paidAt) return false;
        const d = new Date(p.paidAt);
        return d >= mStart && d < mEnd;
      })
    );
    return { label: m.label, entradas, saidas };
  });

  const payVsRecv = months.map((m) => {
    const mStart = new Date(m.year, m.month, 1);
    const mEnd = new Date(m.year, m.month + 1, 1);
    const receber = sum(
      receivables.filter((r) => {
        const d = new Date(r.dueDate);
        return d >= mStart && d < mEnd;
      })
    );
    const pagar = sum(
      payables.filter((p) => {
        const d = new Date(p.dueDate);
        return d >= mStart && d < mEnd;
      })
    );
    return { label: m.label, receber, pagar };
  });

  return (
    <ErpDashboardView
      receitaLiquida={receitaLiquida}
      lucroOperacional={lucroOperacional}
      inadimplencia={inadimplencia}
      custosFixos={custosFixos}
      aReceber={aReceber}
      aPagar={aPagar}
      cashFlow={cashFlow}
      payVsRecv={payVsRecv}
      accounts={accounts.map((a: any) => ({ ...a, balance: Number(a.balance) }))}
    />
  );
}
