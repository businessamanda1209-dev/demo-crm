import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    await prisma.party.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        personType: body.personType,
        document: body.document || null,
        tradeName: body.tradeName || null,
        legalName: body.legalName,
        isCustomer: body.isCustomer,
        isSupplier: body.isSupplier,
        isTransporter: body.isTransporter,
        email: body.email || null,
        phone: body.phone || null,
        active: body.active,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await prisma.party.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
