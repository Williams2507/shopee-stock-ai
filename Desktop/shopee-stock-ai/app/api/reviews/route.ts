import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data: reviews, error } = await supabaseAdmin
      .from("reviews")
      .select("*")
      .order("review_time", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
    });
  } catch (error) {
    console.error("Erro buscando avaliações:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar avaliações.",
      },
      { status: 500 }
    );
  }
}