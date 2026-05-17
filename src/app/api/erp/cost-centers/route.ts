import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const ccs = await prisma.costCenter.findMany({ where: { userId: user.id }, orderBy: { code: "asc" } });
    return NextResponse.json(ccs);
  } catch (e) {
    console.error("[cost-centers GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const cc = await prisma.costCenter.create({
      data: { userId: user.id, code: body.code, name: body.name, active: body.active ?? true },
    });
    return NextResponse.json(cc, { status: 201 });
  } catch (e) {
    console.error("[cost-centers POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
