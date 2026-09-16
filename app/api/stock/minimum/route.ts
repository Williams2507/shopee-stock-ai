import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const variationId = body.variationId;
    const minStock = Number(body.minStock);

    if (!variationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Variação é obrigatória.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(minStock) ||
      minStock < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "O estoque mínimo deve ser um número inteiro maior ou igual a zero.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("product_variations")
      .update({
        min_stock: minStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", variationId)
      .select("id, min_stock")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      variation: data,
      message: "Estoque mínimo atualizado!",
    });
  } catch (error) {
    console.error(
      "Erro atualizando estoque mínimo:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar estoque mínimo.",
      },
      { status: 500 }
    );
  }
}