import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id, shop_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (storeError) throw storeError;

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada para este usuário.",
        },
        { status: 404 }
      );
    }

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

    const { data: ownedVariation, error: ownedVariationError } =
      await supabaseAdmin
        .from("product_variations")
        .select("id, products!inner(store_id)")
        .eq("id", variationId)
        .eq("products.store_id", store.id)
        .maybeSingle();

    if (ownedVariationError) throw ownedVariationError;

    if (!ownedVariation) {
      return NextResponse.json(
        { success: false, error: "Variação não encontrada." },
        { status: 404 }
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
