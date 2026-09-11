import { shopeeGet } from "./api";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function syncProducts(
  store: any
) {
  let offset = 0;
  const pageSize = 50;

  let totalProducts = 0;
  let totalVariations = 0;

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

    const items =
      listData.response?.item_list || [];

    if (items.length === 0) {
      break;
    }

    const itemIds = items.map(
      (item: any) =>
        Number(item.item_id)
    );

    const baseInfo =
      await shopeeGet(
        "/api/v2/product/get_item_base_info",
        store,
        {
          item_id_list:
            itemIds.join(","),
          need_tax_info: "false",
          need_complaint_policy: "false",
        }
      );

    const products =
      baseInfo.response?.item_list || [];

    for (const product of products) {
      const listItem = items.find(
        (item: any) =>
          Number(item.item_id) ===
          Number(product.item_id)
      );

      const { data: savedProduct, error } =
        await supabaseAdmin
          .from("products")
          .upsert(
            {
              store_id: store.id,
              shopee_item_id:
                Number(product.item_id),

              sku:
                product.item_sku ||
                null,

              name:
                product.item_name ||
                "Produto sem nome",

              price:
                Number(
                  product.price_info
                    ?.current_price || 0
                ),

              status:
                listItem?.item_status ||
                "NORMAL",

              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "store_id,shopee_item_id",
            }
          )
          .select()
          .single();

      if (error || !savedProduct) {
        console.error(
          "Erro salvando produto:",
          error
        );

        continue;
      }

      totalProducts++;

      const models =
        product.models || [];

      for (const model of models) {
        const { error: variationError } =
          await supabaseAdmin
            .from("product_variations")
            .upsert(
              {
                product_id:
                  savedProduct.id,

                shopee_model_id:
                  Number(model.model_id),

                sku:
                  model.model_sku ||
                  null,

                name:
                  model.model_name ||
                  "Variação",

                price:
                  Number(
                    model.price_info
                      ?.current_price || 0
                  ),

                updated_at:
                  new Date().toISOString(),
              },
              {
                onConflict:
                  "product_id,shopee_model_id",
              }
            );

        if (!variationError) {
          totalVariations++;
        } else {
          console.error(
            "Erro salvando variação:",
            variationError
          );
        }
      }
    }

    const hasNext =
      listData.response
        ?.has_next_page === true;

    if (!hasNext) {
      break;
    }

    offset += pageSize;
  }

  return {
    products: totalProducts,
    variations: totalVariations,
  };
}

//a