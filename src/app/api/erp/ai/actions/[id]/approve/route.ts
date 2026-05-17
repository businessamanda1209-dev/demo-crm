import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const action = await (prisma as any).aiDraftAction.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!action) return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
    if (action.status !== "DRAFT") {
      return NextResponse.json({ error: `Ação já está ${action.status}` }, { status: 400 });
    }

    const payload = action.payload as Record<string, any>;
    let targetId: string | null = null;

    try {
      switch (action.type) {
        case "create_customer":
        case "create_supplier": {
          const party = await prisma.party.create({
            data: {
              userId: user.id,
              legalName: payload.legalName || "Sem nome",
              tradeName: payload.tradeName || null,
              document: payload.document || null,
              email: payload.email || null,
              phone: payload.phone || null,
              isCustomer: action.type === "create_customer",
              isSupplier: action.type === "create_supplier",
              personType: payload.personType ?? "PESSOA_JURIDICA",
            },
          });
          targetId = party.id;
          break;
        }
        case "create_category": {
          const cat = await prisma.financialCategory.create({
            data: {
              userId: user.id,
              description: payload.description || "Nova categoria",
              type: payload.type === "REVENUE" ? "REVENUE" : "EXPENSE",
            },
          });
          targetId = cat.id;
          break;
        }
        case "create_cost_center": {
          const cc = await prisma.costCenter.create({
            data: {
              userId: user.id,
              name: payload.name || "Novo centro",
              code: (payload.code || payload.name || "CC").toString().slice(0, 16),
            },
          });
          targetId = cc.id;
          break;
        }
        case "create_payable": {
          const pay = await prisma.payable.create({
            data: {
              userId: user.id,
              description: payload.description || "Despesa",
              amount: Number(payload.amount || 0),
              dueDate: new Date(payload.dueDate || Date.now()),
              competenceDate: new Date(payload.competenceDate || payload.dueDate || Date.now()),
              status: payload.status || "OPEN",
              partyId: payload.partyId || null,
              categoryId: payload.categoryId || null,
            },
          });
          targetId = pay.id;
          break;
        }
        case "create_receivable": {
          const recv = await prisma.receivable.create({
            data: {
              userId: user.id,
              description: payload.description || "Receita",
              amount: Number(payload.amount || 0),
              dueDate: new Date(payload.dueDate || Date.now()),
              competenceDate: new Date(payload.competenceDate || payload.dueDate || Date.now()),
              status: payload.status || "OPEN",
              type: payload.type || "SERVICO",
              partyId: payload.partyId || null,
              categoryId: payload.categoryId || null,
            },
          });
          targetId = recv.id;
          break;
        }
        default:
          throw new Error(`Tipo desconhecido: ${action.type}`);
      }

      const updated = await (prisma as any).aiDraftAction.update({
        where: { id: action.id },
        data: { status: "EXECUTED", targetId, errorMessage: null },
      });
      return NextResponse.json(updated);
    } catch (execErr) {
      const msg = execErr instanceof Error ? execErr.message : String(execErr);
      console.error("[ai action execute]", execErr);
      const updated = await (prisma as any).aiDraftAction.update({
        where: { id: action.id },
        data: { status: "FAILED", errorMessage: msg },
      });
      return NextResponse.json(updated, { status: 500 });
    }
  } catch (e) {
    console.error("[ai action approve]", e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
