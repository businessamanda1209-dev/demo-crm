import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const payableId = searchParams.get("payableId") || undefined;
    const receivableId = searchParams.get("receivableId") || undefined;
    const where: Record<string, unknown> = { userId: user.id };
    if (payableId) where.payableId = payableId;
    if (receivableId) where.receivableId = receivableId;
    const items = await prisma.attachment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("[attachments GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.filename) return NextResponse.json({ error: "Nome do arquivo é obrigatório." }, { status: 400 });
    if (body.fileType === "other" && !body.description) {
      return NextResponse.json({ error: "Descrição é obrigatória para o tipo 'Outros'." }, { status: 400 });
    }
    // TODO: integrate with Supabase Storage for actual upload. fileUrl is a placeholder for now.
    const created = await prisma.attachment.create({
      data: {
        userId: user.id,
        payableId: body.payableId || null,
        receivableId: body.receivableId || null,
        filename: body.filename,
        fileUrl: body.fileUrl || "",
        fileType: body.fileType || "other",
        description: body.description || null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[attachments POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
