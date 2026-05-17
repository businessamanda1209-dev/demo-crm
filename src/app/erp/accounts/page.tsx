import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AccountsView from "./AccountsView";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await prisma.financialAccount
    .findMany({ where: { userId: user.id }, orderBy: { name: "asc" } })
    .catch(() => []);

  return (
    <AccountsView
      initialAccounts={accounts.map((a) => ({ ...a, balance: Number(a.balance) }))}
    />
  );
}
