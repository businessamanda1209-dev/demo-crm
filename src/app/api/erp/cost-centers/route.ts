import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const ccs = await prisma.costCenter.findMany({ where: { userId: user.id }, orderBy: { code: "asc" } });
    return NextResponse.json(ccs);
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const cc = await prisma.costCenter.create({
      data: { userId: user.id, code: body.code, name: body.name, active: body.active ?? true },
    });
    return NextResponse.json(cc, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
