import { requireUser } from "@/lib/auth";
import AccountingClosingView from "./AccountingClosingView";

export const dynamic = "force-dynamic";

export default async function AccountingClosingPage() {
  await requireUser();
  return <AccountingClosingView />;
}
