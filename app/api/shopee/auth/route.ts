    import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  const redirectUrl = process.env.SHOPEE_REDIRECT_URL;

  if (!partnerId || !partnerKey || !redirectUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "Configuração da Shopee não encontrada.",
      },
      { status: 500 }
    );
  }

  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);

  const baseString = `${partnerId}${path}${timestamp}`;

  const sign = crypto
    .createHmac("sha256", partnerKey)
    .update(baseString)
    .digest("hex");

  const url = new URL(
    `https://partner.shopeemobile.com${path}`
  );

  url.searchParams.set("partner_id", partnerId);
  url.searchParams.set("timestamp", timestamp.toString());
  url.searchParams.set("sign", sign);
  url.searchParams.set("redirect", redirectUrl);

  return NextResponse.redirect(url.toString());
}