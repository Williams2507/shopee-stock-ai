import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const leadTimeDays = Number(body.leadTimeDays);
    const safetyDays = Number(body.safetyDays);

    if (
      !Number.isInteger(leadTimeDays) ||
      leadTimeDays < 0 ||
      leadTimeDays > 365
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Prazo de entrega inválido.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(safetyDays) ||
      safetyDays < 0 ||
      safetyDays > 365
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Margem de segurança inválida.",
        },
        { status: 400 }
      );
    }

    const user = await requireUser(request);

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada.",
        },
        { status: 404 }
      );
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("stores")
        .update({
          lead_time_days: leadTimeDays,
          safety_days: safetyDays,
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,

      settings: {
        leadTimeDays,
        safetyDays,
        coverageTargetDays:
          leadTimeDays + safetyDays,
      },

      message:
        "Configurações de reposição atualizadas!",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    console.error(
      "Erro atualizando configurações de estoque:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar configurações.",
      },
      { status: 500 }
    );
  }
}
