import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Pega a loja conectada
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("shop_id", 227703795)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada no Supabase.",
        },
        { status: 404 }
      );
    }

    // Teste inicial da API da Shopee
    const response = await fetch(
      "https://openplatform.sandbox.test-stable.shopee.sg/api/v2/shop/get_shop_info",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${store.access_token}`,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      shopId: store.shop_id,
      shopeeResponse: data,
    });
  } catch (error) {
    console.error("Erro ao testar Shopee:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao testar API da Shopee.",
      },
      { status: 500 }
    );
  }
}