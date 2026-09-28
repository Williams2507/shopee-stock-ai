import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

import { SHOPEE_HOST } from "@/lib/shopee/config";

function dashboardUrl(
  request: Request,
  params?: Record<string, string>
) {
  const url = new URL("/", request.url);

  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function clearConnectionCookie(response: NextResponse) {
  response.cookies.set("shopee_connect", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const shopIdParam = url.searchParams.get("shop_id");

    const cookieHeader = request.headers.get("cookie");

    const nonce = cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("shopee_connect="))
      ?.slice("shopee_connect=".length);

    if (!code || !shopIdParam || !nonce) {
      return clearConnectionCookie(
        NextResponse.redirect(
          dashboardUrl(request, {
            shopee_error: "authorization_missing",
          })
        )
      );
    }

    const shopId = Number(shopIdParam);

    if (!Number.isSafeInteger(shopId) || shopId <= 0) {
      return clearConnectionCookie(
        NextResponse.redirect(
          dashboardUrl(request, {
            shopee_error: "invalid_shop",
          })
        )
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
      return clearConnectionCookie(
        NextResponse.redirect(
          dashboardUrl(request, {
            shopee_error: "connection_expired",
          })
        )
      );
    }

    const partnerId = process.env.SHOPEE_PARTNER_ID;
    const partnerKey = process.env.SHOPEE_PARTNER_KEY;

    if (!partnerId || !partnerKey) {
      throw new Error("Credenciais da Shopee não configuradas.");
    }

    /*
     * REGRA 1:
     * Descobre se esse usuário já possui uma loja.
     *
     * Nosso MVP trabalha com exatamente 1 loja por usuário.
     */
    const { data: userStore, error: userStoreError } =
      await supabaseAdmin
        .from("stores")
        .select("id, user_id, shop_id")
        .eq("user_id", connection.user_id)
        .maybeSingle();

    if (userStoreError) {
      throw userStoreError;
    }

    /*
     * Se o usuário já tem uma loja diferente da que acabou
     * de autorizar, não permitimos adicionar uma segunda loja.
     */
    if (
      userStore &&
      Number(userStore.shop_id) !== shopId
    ) {
      return clearConnectionCookie(
        NextResponse.redirect(
          dashboardUrl(request, {
            shopee_error: "account_already_has_store",
          })
        )
      );
    }

    /*
     * REGRA 2:
     * A mesma loja Shopee não pode pertencer a outro usuário.
     */
    const { data: shopStore, error: shopStoreError } =
      await supabaseAdmin
        .from("stores")
        .select("id, user_id, shop_id")
        .eq("shop_id", shopId)
        .maybeSingle();

    if (shopStoreError) {
      throw shopStoreError;
    }

    if (
      shopStore?.user_id &&
      shopStore.user_id !== connection.user_id
    ) {
      return clearConnectionCookie(
        NextResponse.redirect(
          dashboardUrl(request, {
            shopee_error: "shop_already_connected",
          })
        )
      );
    }

    /*
     * Troca o authorization code pelos tokens Shopee.
     */
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);

    const baseString = `${partnerId}${path}${timestamp}`;

    const sign = crypto
      .createHmac("sha256", partnerKey)
      .update(baseString)
      .digest("hex");

    const tokenUrl = new URL(`${SHOPEE_HOST}${path}`);

    tokenUrl.searchParams.set("partner_id", partnerId);
    tokenUrl.searchParams.set(
      "timestamp",
      timestamp.toString()
    );
    tokenUrl.searchParams.set("sign", sign);

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        shop_id: shopId,
        partner_id: Number(partnerId),
      }),
      cache: "no-store",
    });

    const tokenData = await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      tokenData.error ||
      !tokenData.access_token ||
      !tokenData.refresh_token
    ) {
      console.error("Erro de token Shopee:", {
        status: tokenResponse.status,
        error: tokenData?.error,
        message: tokenData?.message,
      });

      return clearConnectionCookie(
        NextResponse.redirect(
          dashboardUrl(request, {
            shopee_error: "token_exchange_failed",
          })
        )
      );
    }

    const expireIn = Number(tokenData.expire_in || 14400);

    const tokenExpiresAt = new Date(
      Date.now() + expireIn * 1000
    ).toISOString();

    const now = new Date().toISOString();

    /*
     * Se a loja já existe para esse usuário:
     * apenas renova os tokens.
     *
     * Caso contrário:
     * cria a primeira loja da conta.
     */
    let store;

    const existingStore = userStore || shopStore;

    if (existingStore) {
      const { data, error } = await supabaseAdmin
        .from("stores")
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          updated_at: now,
        })
        .eq("id", existingStore.id)
        .eq("user_id", connection.user_id)
        .select("id, shop_id")
        .single();

      if (error) {
        throw error;
      }

      store = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("stores")
        .insert({
          user_id: connection.user_id,
          shop_id: shopId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt,
          updated_at: now,
        })
        .select("id, shop_id")
        .single();

      if (error) {
        throw error;
      }

      store = data;
    }

    /*
     * Marca a tentativa de conexão como utilizada.
     */
    const { data: consumedConnection, error: consumeError } =
      await supabaseAdmin
        .from("shopee_connections")
        .update({
          used_at: now,
        })
        .eq("id", connection.id)
        .is("used_at", null)
        .select("id")
        .maybeSingle();

    if (consumeError) {
      throw consumeError;
    }

    if (!consumedConnection) {
      throw new Error("Conexão Shopee já utilizada.");
    }

    console.log(
      `Loja ${store.shop_id} conectada ao usuário ${connection.user_id}.`
    );

    return clearConnectionCookie(
      NextResponse.redirect(
        dashboardUrl(request, {
          shopee_connected: "1",
        })
      )
    );
  } catch (error) {
    console.error("Erro no callback Shopee:", error);

    return clearConnectionCookie(
      NextResponse.redirect(
        dashboardUrl(request, {
          shopee_error: "internal_error",
        })
      )
    );
  }
}