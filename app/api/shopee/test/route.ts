import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("shop_id", 227703795)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada no Supabase.",
        },
        { status: 404 }
      );
    }

    const partnerId = process.env.SHOPEE_PARTNER_ID;
    const partnerKey = process.env.SHOPEE_PARTNER_KEY;

    if (!partnerId || !partnerKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais da Shopee não configuradas.",
        },
        { status: 500 }
      );
    }

    const path = "/api/v2/shop/get_shop_info";
    const timestamp = Math.floor(Date.now() / 1000);

    const baseString = `${partnerId}${path}${timestamp}`;

    const sign = crypto
      .createHmac("sha256", partnerKey)
      .update(baseString)
      .digest("hex");

    const apiUrl =
      `https://openplatform.sandbox.test-stable.shopee.sg${path}` +
      `?partner_id=${partnerId}` +
      `&timestamp=${timestamp}` +
      `&sign=${sign}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${store.access_token}`,
      },
    });

    const data = await response.json();

    return NextResponse.json({
      success: response.ok && !data.error,
      shopId: store.shop_id,
      shopeeResponse: data,
    });
  } catch (error) {
    console.error("Erro ao testar Shopee:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao testar API da Shopee.",
      },
      { status: 500 }
    );
  }
}