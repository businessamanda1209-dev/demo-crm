import { getCurrentUser } from "@/lib/auth";
import ErpShell from "@/components/ErpShell";

export const dynamic = "force-dynamic";

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const chatwootUser = user
    ? {
        id: user.id,
        email: user.email ?? "",
        name:
          (user.user_metadata as any)?.full_name ||
          (user.user_metadata as any)?.name ||
          user.email ||
          "Usuário",
      }
    : null;
  return <ErpShell chatwootUser={chatwootUser}>{children}</ErpShell>;
}
