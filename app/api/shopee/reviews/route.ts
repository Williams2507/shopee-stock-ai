import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { syncReviews } from "@/lib/shopee/sync-reviews";

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



    const result = await syncReviews(store);

    return NextResponse.json({
      success: true,
      message: "Avaliações sincronizadas com sucesso!",
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
