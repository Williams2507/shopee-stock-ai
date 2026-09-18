import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { syncOrders } from "@/lib/shopee/sync-orders";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (storeError) throw storeError;

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Loja não encontrada." },
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

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
