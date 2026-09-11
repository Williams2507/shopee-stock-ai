import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

const SHOPEE_HOST =
  "https://openplatform.sandbox.test-stable.shopee.sg";

function generateSign(
  partnerId: string,
  path: string,
  timestamp: number,
  accessToken: string,
  shopId: number,
  partnerKey: string
) {
  const baseString =
    `${partnerId}${path}${timestamp}${accessToken}${shopId}`;

  return crypto
    .createHmac("sha256", partnerKey)
    .update(baseString)
    .digest("hex");
}

async function shopeeGet(
  path: string,
  store: any,
  params: Record<string, string>
) {
  const partnerId = process.env.SHOPEE_PARTNER_ID!;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!;

  const timestamp = Math.floor(Date.now() / 1000);

  const sign = generateSign(
    partnerId,
    path,
    timestamp,
    store.access_token,
    store.shop_id,
    partnerKey
  );

  const url = new URL(`${SHOPEE_HOST}${path}`);

  url.searchParams.set("partner_id", partnerId);
  url.searchParams.set("timestamp", timestamp.toString());
  url.searchParams.set("sign", sign);
  url.searchParams.set("shop_id", store.shop_id.toString());
  url.searchParams.set(
    "access_token",
    store.access_token
  );

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.message ||
        data.error ||
        "Erro na API da Shopee."
    );
  }

  return data;
}

export async function GET() {
  try {
    /*
     * 1. Busca a loja conectada
     */

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("shop_id", 227703795)
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

    /*
     * 2. Busca lista de produtos
     */

    const itemListData = await shopeeGet(
      "/api/v2/product/get_item_list",
      store,
      {
        offset: "0",
        page_size: "50",
        item_status: "NORMAL",
      }
    );

    const items =
      itemListData.response?.item_list || [];

    /*
     * Loja sem produtos
     */

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum produto encontrado na Shopee.",
        totalShopee: 0,
        savedProducts: 0,
        savedVariations: 0,
      });
    }

    /*
     * 3. Pega os IDs
     */

    const itemIds = items.map(
      (item: any) => Number(item.item_id)
    );

    /*
     * 4. Busca informações completas
     *
     * A API aceita até 50 IDs por chamada.
     */

    const baseInfoData = await shopeeGet(
      "/api/v2/product/get_item_base_info",
      store,
      {
        item_id_list: itemIds.join(","),
        need_tax_info: "false",
        need_complaint_policy: "false",
      }
    );

    const products =
      baseInfoData.response?.item_list || [];

    /*
     * 5. Salva produtos no Supabase
     */

    let savedProducts = 0;
    let savedVariations = 0;

    for (const product of products) {
      const shopeeItemId = Number(product.item_id);

      /*
       * Encontrar status vindo do get_item_list
       */

      const listItem = items.find(
        (item: any) =>
          Number(item.item_id) === shopeeItemId
      );

      const { data: savedProduct, error: productError } =
        await supabaseAdmin
          .from("products")
          .upsert(
            {
              store_id: store.id,
              shopee_item_id: shopeeItemId,
              sku: product.item_sku || null,
              name: product.item_name || "Produto sem nome",
              price: Number(product.price_info?.current_price || 0),
              cost: 0,
              status:
                listItem?.item_status || "NORMAL",
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "store_id,shopee_item_id",
            }
          )
          .select()
          .single();

      if (productError) {
        console.error(
          "Erro ao salvar produto:",
          productError
        );

        continue;
      }

      savedProducts++;

      /*
       * 6. Salvar variações
       */

      const models = product.models || [];

      for (const model of models) {
        const { error: variationError } =
          await supabaseAdmin
            .from("product_variations")
            .upsert(
              {
                product_id: savedProduct.id,
                shopee_model_id: Number(model.model_id),
                sku: model.model_sku || null,
                name:
                  model.model_name ||
                  "Variação",
                price: Number(
                  model.price_info?.current_price || 0
                ),
                cost: 0,
                stock: Number(
                  model.stock_info_v2?.summary_info
                    ?.total_reserved_stock || 0
                ),
                updated_at:
                  new Date().toISOString(),
              },
              {
                onConflict:
                  "product_id,shopee_model_id",
              }
            );

        if (variationError) {
          console.error(
            "Erro ao salvar variação:",
            variationError
          );

          continue;
        }

        savedVariations++;
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Produtos sincronizados com sucesso!",
      totalShopee: products.length,
      savedProducts,
      savedVariations,
    });
  } catch (error) {
    console.error(
      "Erro ao sincronizar produtos:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao sincronizar produtos.",
      },
      { status: 500 }
    );
  }
}