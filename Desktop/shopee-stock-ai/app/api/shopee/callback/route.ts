import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");

    const partnerId = process.env.SHOPEE_PARTNER_ID;
    const partnerKey = process.env.SHOPEE_PARTNER_KEY;

    if (!code || !shopId) {
      return NextResponse.json(
        {
          success: false,
          error: "code ou shop_id não informado pela Shopee.",
        },
        { status: 400 }
      );
    }

    if (!partnerId || !partnerKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais da Shopee não configuradas.",
        },
        { status: 500 }
      );
    }

    // 1. Trocar o code pelos tokens
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);

    const baseString = `${partnerId}${path}${timestamp}`;

    const sign = crypto
      .createHmac("sha256", partnerKey)
      .update(baseString)
      .digest("hex");

    const tokenUrl =
      `https://openplatform.sandbox.test-stable.shopee.sg${path}` +
      `?partner_id=${partnerId}` +
      `&timestamp=${timestamp}` +
      `&sign=${sign}`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        shop_id: Number(shopId),
        partner_id: Number(partnerId),
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      return NextResponse.json(
        {
          success: false,
          error: tokenData.error || "Erro ao obter token da Shopee.",
          message: tokenData.message,
        },
        { status: 400 }
      );
    }

    // 2. Calcular expiração do access token
    const expireIn = Number(tokenData.expire_in || 14400);

    const tokenExpiresAt = new Date(
      Date.now() + expireIn * 1000
    ).toISOString();

    // 3. Salvar/atualizar a loja no Supabase
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .upsert(
        {
          shop_id: Number(shopId),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "shop_id",
        }
      )
      .select()
      .single();

    if (storeError) {
      console.error("Erro ao salvar loja:", storeError);

      return NextResponse.json(
        {
          success: false,
          error: "Token obtido, mas não foi possível salvar a loja.",
          details: storeError.message,
        },
        { status: 500 }
      );
    }

    // 4. Nunca devolver os tokens para o navegador
    return NextResponse.json({
      success: true,
      message: "Loja Shopee conectada e salva com sucesso!",
      shopId: store.shop_id,
      tokenExpiresAt: store.token_expires_at,
    });
  } catch (error) {
    console.error("Erro no callback Shopee:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar autorização da Shopee.",
      },
      { status: 500 }
    );
  }
}