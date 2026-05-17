import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const accounts = await prisma.financialAccount.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(accounts);
  } catch (e) {
    console.error("[accounts GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const account = await prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: body.name,
        type: body.type,
        bankName: body.bankName || null,
        agency: body.agency || null,
        accountNumber: body.accountNumber || null,
        holderType: body.holderType || "PESSOA_JURIDICA",
        canReceive: body.canReceive ?? true,
        canPay: body.canPay ?? true,
        balance: body.balance ? parseFloat(body.balance) : 0,
        active: body.active ?? true,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (e) {
    console.error("[accounts POST]", e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
