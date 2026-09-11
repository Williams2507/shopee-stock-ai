import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

const SHOPEE_HOST =
  "https://openplatform.sandbox.test-stable.shopee.sg";

export async function refreshShopeeToken(store: any) {
  const partnerId = process.env.SHOPEE_PARTNER_ID!;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!;

  const path = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);

  const baseString =
    `${partnerId}${path}${timestamp}`;

  const sign = crypto
    .createHmac("sha256", partnerKey)
    .update(baseString)
    .digest("hex");

  const response = await fetch(
    `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: store.refresh_token,
        shop_id: Number(store.shop_id),
        partner_id: Number(partnerId),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.message ||
        data.error ||
        "Erro ao renovar token da Shopee."
    );
  }

  const newAccessToken =
    data.access_token;

  const newRefreshToken =
    data.refresh_token;

  const expireIn =
    Number(data.expire_in || 14400);

  const expiresAt =
    new Date(
      Date.now() +
        expireIn * 1000
    ).toISOString();

  const { error } =
    await supabaseAdmin
      .from("stores")
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_expires_at: expiresAt,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", store.id);

  if (error) {
    throw error;
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresAt,
  };
}