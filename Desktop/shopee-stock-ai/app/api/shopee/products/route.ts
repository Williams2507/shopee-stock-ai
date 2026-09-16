import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { syncProducts } from "@/lib/shopee/sync-products";

export async function GET() {
  try {
    const { data: store, error } =
      await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("shop_id", 227703795)
        .single();

    if (error || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada.",
        },
        { status: 404 }
      );
    }

    const result =
      await syncProducts(store);

    return NextResponse.json({
      success: true,

      message:
        "Produtos sincronizados com sucesso!",

      ...result,
    });
  } catch (error) {
    console.error(
      "Erro sincronizando produtos:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erro ao sincronizar produtos.",
      },
      { status: 500 }
    );
  }
}