import { shopeeGet } from "./api";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function syncProducts(store: any) {
  let offset = 0;
  const pageSize = 100;

  let totalShopee = 0;
  let savedProducts = 0;
  let savedVariations = 0;

  while (true) {
    const listData = await shopeeGet(
      "/api/v2/product/get_item_list",
      store,
      {
        offset: offset.toString(),
        page_size: pageSize.toString(),
        item_status: "NORMAL",
      }
    );

    const response = listData.response;

    const items = response?.item || response?.item_list || [];

    if (items.length === 0) {
      break;
    }

    totalShopee += items.length;

    const itemIds = items
      .map((item: any) => Number(item.item_id))
      .filter(Boolean);

    // A Shopee permite até 50 produtos por consulta de detalhes
    for (let i = 0; i < itemIds.length; i += 50) {
      const batchIds = itemIds.slice(i, i + 50);

      const detailData = await shopeeGet(
        "/api/v2/product/get_item_base_info",
        store,
        {
          item_id_list: batchIds.join(","),
          need_tax_info: "false",
          need_complaint_policy: "false",
        }
      );

      const detailItems =
        detailData.response?.item_list || [];

      for (const item of detailItems) {
        const { data: savedProduct, error: productError } =
          await supabaseAdmin
            .from("products")
            .upsert(
              {
                store_id: store.id,

                shopee_item_id: Number(item.item_id),

                sku: item.item_sku || "",

                name: item.item_name || "Produto Shopee",

                price: Number(
                  item.price_info?.current_price || 0
                ),

                status: item.item_status || "NORMAL",

                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "store_id,shopee_item_id",
              }
            )
            .select()
            .single();

        if (productError || !savedProduct) {
          console.error(
            "Erro salvando produto:",
            productError
          );

          continue;
        }

        savedProducts++;

        const models =
          item.model_list ||
          item.model_info?.model_list ||
          [];

        for (const model of models) {
          const { error: variationError } =
            await supabaseAdmin
              .from("product_variations")
              .upsert(
                {
                  product_id: savedProduct.id,

                  shopee_model_id:
                    Number(model.model_id),

                  sku: model.model_sku || "",

                  name:
                    model.model_name ||
                    "Variação",

                  price: Number(
                    model.price_info?.current_price ||
                      model.current_price ||
                      0
                  ),

                  // O estoque será sincronizado
                  // em uma etapa específica.
                  stock: 0,

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
              "Erro salvando variação:",
              variationError
            );
          } else {
            savedVariations++;
          }
        }
      }
    }

    const hasNextPage =
      response?.has_next_page === true;

    if (!hasNextPage) {
      break;
    }

    offset += pageSize;
  }

  return {
    totalShopee,
    savedProducts,
    savedVariations,
  };
}