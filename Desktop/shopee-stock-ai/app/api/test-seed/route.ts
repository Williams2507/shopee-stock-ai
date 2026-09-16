import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Busca nossa loja de teste
    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id, shop_id, shop_name")
        .eq("shop_id", 227703795)
        .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja de teste não encontrada.",
        },
        { status: 404 }
      );
    }

    // Cria um produto fictício
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

    // Cria uma variação
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