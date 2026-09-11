import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateReviewResponse } from "@/lib/reviews/generate-response";

export async function POST() {
  try {
    const { data: reviews, error } =
      await supabaseAdmin
        .from("reviews")
        .select("*")
        .eq("response_status", "PENDING")
        .is("ai_response", null);

    if (error) {
      throw error;
    }

    let generated = 0;

    for (const review of reviews || []) {
      await generateReviewResponse(review);
      generated++;
    }

    return NextResponse.json({
      success: true,
      message:
        "Respostas preparadas com sucesso!",
      total: reviews?.length || 0,
      generated,
    });
  } catch (error) {
    console.error(
      "Erro gerando respostas:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao gerar respostas.",
      },
      { status: 500 }
    );
  }
}