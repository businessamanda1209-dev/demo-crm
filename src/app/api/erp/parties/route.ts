import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // customer | supplier | all
    const where: Record<string, unknown> = { userId: user.id, active: true };
    if (role === "customer") where.isCustomer = true;
    if (role === "supplier") where.isSupplier = true;
    const parties = await prisma.party.findMany({
      where,
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true, tradeName: true, document: true, personType: true, isCustomer: true, isSupplier: true },
    });
    return NextResponse.json(parties);
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const party = await prisma.party.create({
      data: {
        userId: user.id,
        personType: body.personType ?? "PESSOA_JURIDICA",
        document: body.document || null,
        tradeName: body.tradeName || null,
        legalName: body.legalName,
        isCustomer: body.isCustomer ?? false,
        isSupplier: body.isSupplier ?? false,
        isTransporter: body.isTransporter ?? false,
        email: body.email || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        billingEmail: body.billingEmail || null,
        fiscalEmail: body.fiscalEmail || null,
        simplesNacional: body.simplesNacional ?? false,
        publicAgency: body.publicAgency ?? false,
        stateRegStatus: body.stateRegStatus || null,
        stateRegNumber: body.stateRegNumber || null,
        municipalReg: body.municipalReg || null,
        suframaReg: body.suframaReg || null,
        addressStreet: body.addressStreet || null,
        addressNumber: body.addressNumber || null,
        addressComplement: body.addressComplement || null,
        addressNeighborhood: body.addressNeighborhood || null,
        addressCity: body.addressCity || null,
        addressState: body.addressState || null,
        addressZip: body.addressZip || null,
        contactName: body.contactName || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        notes: body.notes || null,
        active: body.active ?? true,
      },
    });
    return NextResponse.json(party, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
