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
    const reviewId = body.reviewId;

    if (!reviewId) {
      return NextResponse.json(
        {
          success: false,
          error: "reviewId é obrigatório.",
        },
        { status: 400 }
      );
    }

    const { data: review, error: reviewError } =
      await supabaseAdmin
        .from("reviews")
        .select("id, is_test")
        .eq("id", reviewId)
        .eq("store_id", store.id)
        .single();

    if (reviewError || !review) {
      return NextResponse.json(
        {
          success: false,
          error: "Avaliação não encontrada.",
        },
        { status: 404 }
      );
    }

    if (!review.is_test) {
      return NextResponse.json(
        {
          success: false,
          error: "Somente avaliações de teste podem ser excluídas.",
        },
        { status: 403 }
      );
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("store_id", store.id)
        .eq("is_test", true);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Avaliação de teste excluída!",
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

    console.error("Erro excluindo avaliação teste:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao excluir avaliação de teste.",
      },
      { status: 500 }
    );
  }
}
