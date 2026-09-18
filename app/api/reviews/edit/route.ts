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
    const response = body.response;

    if (!reviewId || !response?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Review e resposta são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("reviews")
      .update({
        edited_response: response.trim(),
        response_status: "PENDING",
        response_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("store_id", store.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Resposta salva com sucesso!",
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

    console.error("Erro salvando resposta:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao salvar resposta.",
      },
      { status: 500 }
    );
  }
}
