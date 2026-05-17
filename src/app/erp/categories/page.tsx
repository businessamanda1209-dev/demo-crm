import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CategoriesView from "./CategoriesView";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await prisma.financialCategory
    .findMany({ where: { userId: user.id }, orderBy: [{ type: "asc" }, { description: "asc" }] })
    .catch(() => []);
  return <CategoriesView initialCategories={categories} />;
}
