import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parties = await prisma.party.findMany({
      where: { userId: user.id, isSupplier: true },
      orderBy: { legalName: "asc" },
    });
    return NextResponse.json(parties);
  } catch (e) {
    console.error("[suppliers GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const party = await prisma.party.create({
      data: {
        userId: user.id,
        personType: body.personType ?? "PESSOA_JURIDICA",
        document: body.document || null,
        tradeName: body.tradeName || null,
        legalName: body.legalName,
        isCustomer: body.isCustomer ?? false,
        isSupplier: true,
        email: body.email || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        notes: body.notes || null,
        active: body.active ?? true,
      },
    });
    return NextResponse.json(party, { status: 201 });
  } catch (e) {
    console.error("[suppliers POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
