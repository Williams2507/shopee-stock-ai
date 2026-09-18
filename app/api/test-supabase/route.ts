import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          success: false,
          error: "Endpoint de teste desativado em produção.",
        },
        { status: 404 }
      );
    }

    const user = await requireUser(request);

    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("id, shop_id, shop_name, user_id")
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      stores: data || [],
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

    console.error("Erro testando Supabase:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno.",
      },
      { status: 500 }
    );
  }
}
