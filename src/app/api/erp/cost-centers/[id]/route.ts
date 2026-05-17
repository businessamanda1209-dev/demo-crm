import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    await prisma.costCenter.updateMany({
      where: { id: params.id, userId: user.id },
      data: { code: body.code, name: body.name, active: body.active },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[cost-centers PATCH]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.costCenter.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[cost-centers DELETE]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
