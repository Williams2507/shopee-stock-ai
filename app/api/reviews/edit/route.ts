import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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
      .eq("id", reviewId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Resposta salva com sucesso!",
    });
  } catch (error) {
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