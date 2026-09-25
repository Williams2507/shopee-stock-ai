import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const SHOPEE_HOST =
  "https://openplatform.sandbox.test-stable.shopee.sg";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

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

    const nonce = crypto.randomBytes(32).toString("hex");
    const nonceHash = crypto
      .createHash("sha256")
      .update(nonce)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    ).toISOString();

    const { error: connectionError } = await supabaseAdmin
      .from("shopee_connections")
      .insert({
        user_id: user.id,
        nonce_hash: nonceHash,
        expires_at: expiresAt,
      });

    if (connectionError) throw connectionError;

    const path = "/api/v2/shop/auth_partner";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseString = `${partnerId}${path}${timestamp}`;

    const sign = crypto
      .createHmac("sha256", partnerKey)
      .update(baseString)
      .digest("hex");

    const url = new URL(`${SHOPEE_HOST}${path}`);
    url.searchParams.set("partner_id", partnerId);
    url.searchParams.set("timestamp", timestamp.toString());
    url.searchParams.set("sign", sign);
    url.searchParams.set("redirect", redirectUrl);

    const response = NextResponse.json({
      success: true,
      url: url.toString(),
    });

    response.cookies.set("shopee_connect", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
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

    console.error("Erro iniciando conexão Shopee:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao iniciar conexão com a Shopee.",
      },
      { status: 500 }
    );
  }
}
