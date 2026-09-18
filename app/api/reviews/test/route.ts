import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (storeError || !store) {
      throw new Error("Loja não encontrada.");
    }

    const { data: review, error } =
      await supabaseAdmin
        .from("reviews")
        .insert({
          store_id: store.id,
          shopee_review_id: -Date.now(),
          username: "Cliente Teste",
          rating: 5,
          comment:
            "Produto chegou rápido e gostei bastante! Avaliação criada para teste.",
          response_status: "PENDING",
          review_time: new Date().toISOString(),
          is_test: true,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Avaliação de teste criada!",
      review,
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

    console.error("Erro criando avaliação teste:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro criando avaliação de teste.",
      },
      { status: 500 }
    );
  }
}
