import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data: stores, error } =
      await supabaseAdmin
        .from("stores")
        .select("id, shop_id, shop_name, token_expires_at");

    return NextResponse.json({
      success: true,
      stores,
      error: error?.message || null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
    });
  }
}