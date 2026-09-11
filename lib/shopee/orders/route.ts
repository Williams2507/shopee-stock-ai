import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { syncOrders } from "@/lib/shopee/sync-orders";

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

    const result = await syncOrders(store);

    return NextResponse.json({
      success: true,
      message: "Pedidos sincronizados com sucesso!",
      ...result,
    });
  } catch (error) {
    console.error(
      "Erro sincronizando pedidos:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao sincronizar pedidos.",
      },
      { status: 500 }
    );
  }
}