import { NextResponse } from "next/server";
import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { refreshShopeeToken } from "@/lib/shopee/refresh-token";

const SHOPEE_HOST =
  "https://openplatform.sandbox.test-stable.shopee.sg";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id, shop_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (storeError) throw storeError;

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada para este usuário.",
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const reviewId = body.reviewId;

    if (!reviewId) {
      return NextResponse.json(
        {
          success: false,
          error: "reviewId é obrigatório.",
        },
        { status: 400 }
      );
    }

    // Busca a avaliação
    const { data: review, error: reviewError } =
      await supabaseAdmin
        .from("reviews")
        .select("*")
        .eq("id", reviewId)
        .eq("store_id", store.id)
        .single();

    if (reviewError || !review) {
      return NextResponse.json(
        {
          success: false,
          error: "Avaliação não encontrada.",
        },
        { status: 404 }
      );
    }
    // =====================================================
    // BLOQUEIA AVALIAÇÕES DE TESTE
    // =====================================================

    if (review.is_test) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Avaliações de teste não podem ser enviadas para a Shopee.",
        },
        { status: 400 }
      );
    }
    // Usa a resposta editada, caso exista.
    // Caso contrário, usa a resposta preparada.
    const responseText =
      review.edited_response ||
      review.ai_response;

    if (!responseText) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Esta avaliação ainda não possui uma resposta.",
        },
        { status: 400 }
      );
    }

    if (review.response_status === "SENT") {
      return NextResponse.json(
        {
          success: false,
          error: "Esta avaliação já foi respondida.",
        },
        { status: 400 }
      );
    }

    // Busca a loja
    const { data: shopeeStore, error: shopeeStoreError } =
      await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("id", review.store_id)
        .eq("user_id", user.id)
        .single();

    if (shopeeStoreError || !shopeeStore) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // RENOVA TOKEN SE ESTIVER EXPIRADO OU PERTO DE EXPIRAR
    // =====================================================

    let currentStore = shopeeStore;

    if (shopeeStore.token_expires_at) {
      const expiresAt =
        new Date(shopeeStore.token_expires_at).getTime();

      const now = Date.now();

      const fiveMinutes =
        5 * 60 * 1000;

      if (expiresAt - now <= fiveMinutes) {
        console.log(
          `Token da loja ${shopeeStore.shop_id} expirado/próximo de expirar. Renovando...`
        );

        const refreshed =
          await refreshShopeeToken(shopeeStore);

        currentStore = {
          ...shopeeStore,
          access_token:
            refreshed.accessToken,
          refresh_token:
            refreshed.refreshToken,
          token_expires_at:
            refreshed.expiresAt,
        };

        console.log(
          `Token da loja ${shopeeStore.shop_id} renovado com sucesso.`
        );
      }
    }

    // =====================================================
    // ASSINATURA SHOPEE
    // =====================================================

    const partnerId =
      process.env.SHOPEE_PARTNER_ID!;

    const partnerKey =
      process.env.SHOPEE_PARTNER_KEY!;

    const path =
      "/api/v2/product/reply_comment";

    const timestamp =
      Math.floor(Date.now() / 1000);

    const baseString =
      `${partnerId}${path}${timestamp}${currentStore.access_token}${currentStore.shop_id}`;

    const sign =
      crypto
        .createHmac(
          "sha256",
          partnerKey
        )
        .update(baseString)
        .digest("hex");

    const url = new URL(
      `${SHOPEE_HOST}${path}`
    );

    url.searchParams.set(
      "partner_id",
      partnerId
    );

    url.searchParams.set(
      "timestamp",
      timestamp.toString()
    );

    url.searchParams.set(
      "sign",
      sign
    );

    url.searchParams.set(
      "shop_id",
      currentStore.shop_id.toString()
    );

    url.searchParams.set(
      "access_token",
      currentStore.access_token
    );

    // =====================================================
    // ENVIA RESPOSTA PARA SHOPEE
    // =====================================================

    const response = await fetch(
      url.toString(),
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          comment_list: [
            {
              comment_id:
                Number(
                  review.shopee_review_id
                ),
              comment:
                responseText,
            },
          ],
        }),
      }
    );

    const data =
      await response.json();
if (
  !response.ok ||
  data.error ||
  data.result_list
) {const resultList =
  data.response?.result_list ||
  data.result_list ||
  [];

const failedResult = resultList.find(
  (result: {
    fail_error?: string;
    fail_message?: string;
  }) => result.fail_error
);

if (!response.ok || data.error || failedResult) {
  const shopeeError =
    failedResult?.fail_message ||
    data.message ||
    data.error ||
    "A Shopee recusou o envio da resposta.";

  const errorCode =
    failedResult?.fail_error ||
    data.error ||
    "unknown_error";

  console.error(
    "ERRO SHOPEE:",
    JSON.stringify(data, null, 2)
  );

  await supabaseAdmin
    .from("reviews")
    .update({
      response_status: "PENDING",
      response_error: `${errorCode}: ${shopeeError}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", review.id);

  return NextResponse.json(
    {
      success: false,
      error: shopeeError,
      errorCode,
    },
    { status: 400 }
  );
}
  console.error(
    "ERRO SHOPEE:",
    JSON.stringify(data, null, 2)
  );

  return NextResponse.json(
    {
      success: false,
      shopeeResponse: data,
    },
    { status: 500 }
  );
}

    // =====================================================
    // MARCA AVALIAÇÃO COMO ENVIADA
    // =====================================================

    const { error: updateError } =
      await supabaseAdmin
        .from("reviews")
        .update({
          response_status: "SENT",
          response_sent_at:
            new Date().toISOString(),
          response_error: null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", review.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message:
        "Resposta enviada para a Shopee com sucesso!",
      reviewId: review.id,
      shopeeReviewId:
        review.shopee_review_id,
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

    console.error(
      "Erro enviando resposta:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao enviar resposta.",
      },
      { status: 500 }
    );
  }
}
