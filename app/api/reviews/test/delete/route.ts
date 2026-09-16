import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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
        .eq("is_test", true);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Avaliação de teste excluída!",
    });
  } catch (error) {
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