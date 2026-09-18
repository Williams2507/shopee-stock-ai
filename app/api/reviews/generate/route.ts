import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { generateReviewResponse } from "@/lib/reviews/generate-response";

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

    const { data: reviews, error } =
      await supabaseAdmin
        .from("reviews")
        .select("*")
        .eq("store_id", store.id)
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
    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

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
