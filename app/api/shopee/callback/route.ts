import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

const SHOPEE_HOST =
  "https://openplatform.sandbox.test-stable.shopee.sg";

function dashboardUrl(request: Request, params?: Record<string, string>) {
  const url = new URL("/", request.url);

  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");

    const nonce = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("shopee_connect="))
      ?.slice("shopee_connect=".length);

    if (!code || !shopId || !nonce) {
      return NextResponse.redirect(
        dashboardUrl(request, {
          shopee_error: "authorization_missing",
        })
      );
    }

    const nonceHash = crypto
      .createHash("sha256")
      .update(decodeURIComponent(nonce))
      .digest("hex");

    const { data: connection, error: connectionError } =
      await supabaseAdmin
        .from("shopee_connections")
        .select("id, user_id, expires_at, used_at")
        .eq("nonce_hash", nonceHash)
        .maybeSingle();

    if (
      connectionError ||
      !connection ||
      connection.used_at ||
      new Date(connection.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.redirect(
        dashboardUrl(request, {
          shopee_error: "connection_expired",
        })
      );
    }

    const partnerId = process.env.SHOPEE_PARTNER_ID;
    const partnerKey = process.env.SHOPEE_PARTNER_KEY;

    if (!partnerId || !partnerKey) {
      throw new Error("Credenciais da Shopee não configuradas.");
    }

    // Impede que uma conta assuma uma loja já pertencente a outra conta.
    const { data: ownedStore, error: ownedStoreError } =
      await supabaseAdmin
        .from("stores")
        .select("id, user_id")
        .eq("shop_id", Number(shopId))
        .maybeSingle();

    if (ownedStoreError) throw ownedStoreError;

    if (
      ownedStore?.user_id &&
      ownedStore.user_id !== connection.user_id
    ) {
      return NextResponse.redirect(
        dashboardUrl(request, {
          shopee_error: "shop_already_connected",
        })
      );
    }

    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseString = `${partnerId}${path}${timestamp}`;

    const sign = crypto
      .createHmac("sha256", partnerKey)
      .update(baseString)
      .digest("hex");

    const tokenUrl = new URL(`${SHOPEE_HOST}${path}`);
    tokenUrl.searchParams.set("partner_id", partnerId);
    tokenUrl.searchParams.set("timestamp", timestamp.toString());
    tokenUrl.searchParams.set("sign", sign);

    const tokenResponse = await fetch(tokenUrl.toString(), {
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
      console.error("Erro de token Shopee:", tokenData);

      return NextResponse.redirect(
        dashboardUrl(request, {
          shopee_error: "token_exchange_failed",
        })
      );
    }

    const expireIn = Number(tokenData.expire_in || 14400);
    const tokenExpiresAt = new Date(
      Date.now() + expireIn * 1000
    ).toISOString();

    let store;

    if (ownedStore) {
      const { data, error } = await supabaseAdmin
        .from("stores")
        .update({
          user_id: connection.user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ownedStore.id)
        .eq("user_id", connection.user_id)
        .select("id, shop_id")
        .single();

      if (error) throw error;
      store = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("stores")
        .insert({
          user_id: connection.user_id,
          shop_id: Number(shopId),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .select("id, shop_id")
        .single();

      if (error) throw error;
      store = data;
    }

    const { error: consumeError } = await supabaseAdmin
      .from("shopee_connections")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("id", connection.id)
      .is("used_at", null);

    if (consumeError) throw consumeError;

    const response = NextResponse.redirect(
      dashboardUrl(request, {
        shopee_connected: "1",
      })
    );

    response.cookies.set("shopee_connect", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    console.log(`Loja ${store.shop_id} conectada com sucesso.`);

    return response;
  } catch (error) {
    console.error("Erro no callback Shopee:", error);

    return NextResponse.redirect(
      dashboardUrl(request, {
        shopee_error: "internal_error",
      })
    );
  }
}
