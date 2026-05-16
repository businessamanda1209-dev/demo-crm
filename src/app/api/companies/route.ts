import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companies = await prisma.company.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    industry,
    website,
    employees,
    annualRevenue,
    city,
    country,
  } = body ?? {};

  if (!name || !industry) {
    return NextResponse.json(
      { error: "name and industry are required" },
      { status: 400 },
    );
  }

  try {
    const company = await prisma.company.create({
      data: {
        userId: user.id,
        name,
        industry,
        website: website || null,
        employees: Number(employees) || 0,
        annualRevenue: Number(annualRevenue) || 0,
        city: city || null,
        country: country || null,
      },
    });
    return NextResponse.json(company, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
