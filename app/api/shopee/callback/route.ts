import { NextResponse } from "next/server";
import crypto from "crypto";

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

    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);

    const baseString = `${partnerId}${path}${timestamp}`;

    const sign = crypto
      .createHmac("sha256", partnerKey)
      .update(baseString)
      .digest("hex");

    const tokenUrl = new URL(
      `https://openplatform.sandbox.test-stable.shopee.sg${path}`
    );

    tokenUrl.searchParams.set("partner_id", partnerId);
    tokenUrl.searchParams.set("timestamp", timestamp.toString());
    tokenUrl.searchParams.set("sign", sign);

    const response = await fetch(tokenUrl.toString(), {
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

    const data = await response.json();

    if (!response.ok || data.error) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Erro ao obter token da Shopee.",
          message: data.message,
          requestId: data.request_id,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Loja Shopee autorizada com sucesso!",
      shopId: data.shop_id,
      expireIn: data.expire_in,
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
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