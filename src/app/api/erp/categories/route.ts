import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const cats = await prisma.financialCategory.findMany({ where: { userId: user.id }, orderBy: { description: "asc" } });
    return NextResponse.json(cats);
  } catch (e) {
    console.error("[categories GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const cat = await prisma.financialCategory.create({
      data: { userId: user.id, type: body.type, description: body.description, active: body.active ?? true },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    console.error("[categories POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
