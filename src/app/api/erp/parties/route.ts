import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // customer | supplier | all
    const type = searchParams.get("type"); // CUSTOMER | SUPPLIER (alias)
    const where: Record<string, unknown> = { userId: user.id };
    const includeInactive = searchParams.get("includeInactive") === "1";
    if (!includeInactive) where.active = true;
    if (role === "customer" || type === "CUSTOMER") where.isCustomer = true;
    if (role === "supplier" || type === "SUPPLIER") where.isSupplier = true;
    const parties = await prisma.party.findMany({
      where,
      orderBy: { legalName: "asc" },
    });
    return NextResponse.json(parties);
  } catch (e) {
    console.error("[parties GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    // ─── De-dup by CPF/CNPJ ────────────────────────────────
    const rawDoc = (body.document || "").toString().trim();
    if (rawDoc) {
      const existing = await prisma.party.findFirst({
        where: { userId: user.id, document: rawDoc },
      });
      if (existing) {
        const data: Record<string, unknown> = {};
        if (body.isCustomer && !existing.isCustomer) data.isCustomer = true;
        if (body.isSupplier && !existing.isSupplier) data.isSupplier = true;
        if (body.isTransporter && !existing.isTransporter) data.isTransporter = true;
        if (!existing.active && body.active !== false) data.active = true;
        const merged = Object.keys(data).length
          ? await prisma.party.update({ where: { id: existing.id }, data })
          : existing;
        return NextResponse.json({ ...merged, _existed: true }, { status: 200 });
      }
    }

    const party = await prisma.party.create({
      data: {
        userId: user.id,
        personType: body.personType ?? "PESSOA_JURIDICA",
        document: rawDoc || null,
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
  } catch (e) {
    console.error("[parties POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
