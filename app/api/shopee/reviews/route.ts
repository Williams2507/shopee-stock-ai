import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { syncReviews } from "@/lib/shopee/sync-reviews";

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
      await syncReviews(store);

    return NextResponse.json({
      success: true,
      message:
        "Avaliações sincronizadas com sucesso!",
      ...result,
    });
  } catch (error) {
    console.error(
      "Erro sincronizando avaliações:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao sincronizar avaliações.",
      },
      { status: 500 }
    );
  }
}