import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import ContactsView from "./ContactsView";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const userId = await requireUserId();
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
    prisma.company.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]).catch(() => [[], []]);

  const serializedContacts = contacts.map((contact) => ({
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    company: contact.company
      ? {
          ...contact.company,
          annualRevenue: Number(contact.company.annualRevenue),
          createdAt: contact.company.createdAt.toISOString(),
          updatedAt: contact.company.updatedAt.toISOString(),
        }
      : null,
  }));

  return <ContactsView initialContacts={serializedContacts} companies={companies} />;
}
