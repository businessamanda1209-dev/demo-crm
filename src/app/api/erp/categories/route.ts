import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const cats = await prisma.financialCategory.findMany({ where: { userId: user.id }, orderBy: { description: "asc" } });
    return NextResponse.json(cats);
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const cat = await prisma.financialCategory.create({
      data: { userId: user.id, type: body.type, description: body.description, active: body.active ?? true },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
