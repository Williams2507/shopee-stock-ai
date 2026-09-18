import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          success: false,
          error: "Endpoint de teste desativado em produção.",
        },
        { status: 404 }
      );
    }

    const user = await requireUser(request);

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id, shop_id, shop_name")
        .eq("user_id", user.id)
        .maybeSingle();

    if (storeError) throw storeError;

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja de teste não encontrada.",
        },
        { status: 404 }
      );
    }

    const { data: product, error: productError } =
      await supabaseAdmin
        .from("products")
        .upsert(
          {
            store_id: store.id,
            shopee_item_id: 999999001,
            sku: "TEST-GTA-165",
            name: "Manopla GTA 165mm - TESTE",
            price: 19.90,
            cost: 4.21,
            status: "ACTIVE",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "store_id,shopee_item_id",
          }
        )
        .select()
        .single();

    if (productError || !product) {
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao criar produto.",
          details: productError?.message,
        },
        { status: 500 }
      );
    }

    const { data: variation, error: variationError } =
      await supabaseAdmin
        .from("product_variations")
        .upsert(
          {
            product_id: product.id,
            shopee_model_id: 999999001,
            sku: "TEST-GTA-165-BR",
            name: "Preto",
            price: 19.90,
            cost: 4.21,
            stock: 25,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "product_id,shopee_model_id",
          }
        )
        .select()
        .single();

    if (variationError || !variation) {
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao criar variação.",
          details: variationError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Produto de teste criado com sucesso!",
      store: {
        id: store.id,
        shopId: store.shop_id,
      },
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
      },
      variation: {
        id: variation.id,
        name: variation.name,
        stock: variation.stock,
        price: variation.price,
        cost: variation.cost,
      },
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

    console.error("Erro no seed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno.",
      },
      { status: 500 }
    );
  }
}
