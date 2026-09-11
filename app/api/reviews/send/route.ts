import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { shopeeGet } from "@/lib/shopee/api";

export async function POST(request: Request) {
  try {
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

    // Usa a resposta editada, caso exista.
    // Caso contrário, usa a resposta preparada.
    const responseText =
      review.edited_response ||
      review.ai_response;

    if (!responseText) {
      return NextResponse.json(
        {
          success: false,
          error: "Esta avaliação ainda não possui uma resposta.",
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

    // Envia para a Shopee
    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("id", review.store_id)
        .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada.",
        },
        { status: 404 }
      );
    }

    const partnerId =
      process.env.SHOPEE_PARTNER_ID!;

    const partnerKey =
      process.env.SHOPEE_PARTNER_KEY!;

    const crypto =
      await import("crypto");

    const path =
      "/api/v2/product/reply_comment";

    const timestamp =
      Math.floor(Date.now() / 1000);

    const baseString =
      `${partnerId}${path}${timestamp}${store.access_token}${store.shop_id}`;

    const sign =
      crypto
        .createHmac(
          "sha256",
          partnerKey
        )
        .update(baseString)
        .digest("hex");

    const url = new URL(
      `https://openplatform.sandbox.test-stable.shopee.sg${path}`
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
      store.shop_id.toString()
    );

    url.searchParams.set(
      "access_token",
      store.access_token
    );

    const response =
      await fetch(
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
      data.error
    ) {
      throw new Error(
        data.message ||
          data.error ||
          "Erro ao enviar resposta para a Shopee."
      );
    }

    // Marca como enviada
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