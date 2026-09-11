import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("shop_id", 227703795)
        .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada.",
        },
        { status: 404 }
      );
    }

    const { data: products, error: productsError } =
      await supabaseAdmin
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", {
          ascending: false,
        });

    if (productsError) {
      throw productsError;
    }

    const productIds =
      products?.map((product) => product.id) || [];

    let variations: any[] = [];

    if (productIds.length > 0) {
      const { data, error: variationsError } =
        await supabaseAdmin
          .from("product_variations")
          .select("*")
          .in("product_id", productIds);

      if (variationsError) {
        throw variationsError;
      }

      variations = data || [];
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      variations,
    });
  } catch (error) {
    console.error(
      "Erro no dashboard:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao carregar dashboard.",
      },
      { status: 500 }
    );
  }
}