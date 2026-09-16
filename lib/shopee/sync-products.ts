import { shopeeGet } from "./api";
import { supabaseAdmin } from "@/lib/supabase/server";

async function saveStockSnapshot(
  storeId: string,
  productId: string,
  variationId: string,
  stock: number
) {
  const snapshotDate = new Date().toISOString().slice(0, 10);

  const { error } = await supabaseAdmin
    .from("stock_history")
    .upsert(
      {
        store_id: storeId,
        product_id: productId,
        variation_id: variationId,
        stock,
        snapshot_date: snapshotDate,
      },
      { onConflict: "variation_id,snapshot_date" }
    );

  if (error) {
    console.error("Erro salvando histórico de estoque:", error);
  }
}

export async function syncProducts(store: any) {
  let offset = 0;
  const pageSize = 100;
  let totalShopee = 0;
  let savedProducts = 0;
  let savedVariations = 0;

  while (true) {
    const listData = await shopeeGet("/api/v2/product/get_item_list", store, {
      offset: offset.toString(),
      page_size: pageSize.toString(),
      item_status: "NORMAL",
    });

    const response = listData.response;
    const items = response?.item || response?.item_list || [];
    if (items.length === 0) break;

    totalShopee += items.length;
    const itemIds = items.map((item: any) => Number(item.item_id)).filter(Boolean);

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

      const detailItems = detailData.response?.item_list || [];

      for (const item of detailItems) {
        const { data: savedProduct, error: productError } = await supabaseAdmin
          .from("products")
          .upsert(
            {
              store_id: store.id,
              shopee_item_id: Number(item.item_id),
              sku: item.item_sku || "",
              name: item.item_name || "Produto Shopee",
              price: Number(
                item.price_info?.current_price ||
                  item.price_info?.[0]?.current_price ||
                  0
              ),
              status: item.item_status || "NORMAL",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "store_id,shopee_item_id" }
          )
          .select()
          .single();

        if (productError || !savedProduct) {
          console.error("Erro salvando produto:", productError);
          continue;
        }

        savedProducts++;

        const modelData = await shopeeGet(
          "/api/v2/product/get_model_list",
          store,
          { item_id: Number(item.item_id).toString() }
        );

        const models = modelData.response?.model || [];

        if (models.length === 0) {
          const stockInfo = item.stock_info_v2;
          let stock = 0;

          if (stockInfo) {
            if (typeof stockInfo.current_stock === "number") {
              stock = stockInfo.current_stock;
            } else if (Array.isArray(stockInfo) && stockInfo.length > 0) {
              stock = Number(stockInfo[0]?.current_stock || 0);
            }
          }

          const { data: savedVariation, error: variationError } =
            await supabaseAdmin
              .from("product_variations")
              .upsert(
                {
                  product_id: savedProduct.id,
                  shopee_model_id: 0,
                  sku: item.item_sku || "",
                  name: "Único",
                  price: Number(
                    item.price_info?.current_price ||
                      item.price_info?.[0]?.current_price ||
                      0
                  ),
                  stock,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "product_id,shopee_model_id" }
              )
              .select("id")
              .single();

          if (variationError || !savedVariation) {
            console.error("Erro salvando estoque:", variationError);
          } else {
            savedVariations++;
            await saveStockSnapshot(
              store.id,
              savedProduct.id,
              savedVariation.id,
              stock
            );
          }
          continue;
        }

        for (const model of models) {
          const stockInfo = model.stock_info_v2;
          let stock = 0;

          if (stockInfo) {
            if (typeof stockInfo.current_stock === "number") {
              stock = stockInfo.current_stock;
            } else if (Array.isArray(stockInfo) && stockInfo.length > 0) {
              stock = Number(stockInfo[0]?.current_stock || 0);
            }
          }

          const price =
            model.price_info?.[0]?.current_price ||
            model.price_info?.current_price ||
            0;

          const { data: savedVariation, error: variationError } =
            await supabaseAdmin
              .from("product_variations")
              .upsert(
                {
                  product_id: savedProduct.id,
                  shopee_model_id: Number(model.model_id),
                  sku: model.model_sku || "",
                  name: model.model_name || `Variação ${model.model_id}`,
                  price: Number(price),
                  stock,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "product_id,shopee_model_id" }
              )
              .select("id")
              .single();

          if (variationError || !savedVariation) {
            console.error("Erro salvando variação:", variationError);
          } else {
            savedVariations++;
            await saveStockSnapshot(
              store.id,
              savedProduct.id,
              savedVariation.id,
              stock
            );
          }
        }
      }
    }

    if (response?.has_next_page !== true) break;
    offset += pageSize;
  }

  return { totalShopee, savedProducts, savedVariations };
}