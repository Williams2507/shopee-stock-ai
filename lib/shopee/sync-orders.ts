import { shopeeGet } from "./api";
import { supabaseAdmin } from "@/lib/supabase/server";

const ORDER_FIELDS = [
  "order_sn",
  "order_status",
  "buyer_user_id",
  "buyer_username",
  "estimated_shipping_fee",
  "actual_shipping_fee",
  "recipient_address",
  "item_list",
  "pay_time",
  "shipping_carrier",
  "payment_method",
  "total_amount",
  "cancel_by",
  "cancel_reason",
  "actual_shipping_fee_confirmed",
  "pickup_done_time",
  "package_list",
].join(",");

export async function syncOrders(store: any) {
  let cursor = "";
  let hasMore = true;

  let totalOrders = 0;
  let totalItems = 0;

  while (hasMore) {
    const params: Record<string, string> = {
      time_range_field: "create_time",

      time_from: Math.floor(
        (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
      ).toString(),

      time_to: Math.floor(Date.now() / 1000).toString(),

      page_size: "50",
    };

    if (cursor) {
      params.cursor = cursor;
    }

    const listData = await shopeeGet(
      "/api/v2/order/get_order_list",
      store,
      params
    );

    const response = listData.response;

    const orderList =
      response?.order_list || [];

    if (orderList.length === 0) {
      break;
    }

    for (let i = 0; i < orderList.length; i += 50) {
      const batch = orderList.slice(i, i + 50);

      const orderSnList = batch
        .map((order: any) => order.order_sn)
        .join(",");

      const detailData = await shopeeGet(
        "/api/v2/order/get_order_detail",
        store,
        {
          order_sn_list: orderSnList,
          response_optional_fields: ORDER_FIELDS,
        }
      );

      const detailedOrders =
        detailData.response?.order_list || [];

      for (const order of detailedOrders) {
        const { data: savedOrder, error } =
          await supabaseAdmin
            .from("orders")
            .upsert(
              {
                store_id: store.id,

                shopee_order_id:
                  order.order_sn,

                status:
                  order.order_status,

                total_amount: Number(
                  order.total_amount || 0
                ),

                order_date: order.create_time
                  ? new Date(
                      Number(order.create_time) *
                        1000
                    ).toISOString()
                  : new Date().toISOString(),

                updated_at:
                  new Date().toISOString(),
              },
              {
                onConflict:
                  "store_id,shopee_order_id",
              }
            )
            .select()
            .single();

        if (error || !savedOrder) {
          console.error(
            "Erro salvando pedido:",
            error
          );

          continue;
        }

        totalOrders++;

        const items =
          order.item_list || [];

        for (const item of items) {
          // Procura o produto
          const { data: product } =
            await supabaseAdmin
              .from("products")
              .select("id")
              .eq("store_id", store.id)
              .eq(
                "shopee_item_id",
                Number(item.item_id)
              )
              .maybeSingle();

          let variationId = null;

          // Procura a variação
          if (
            product &&
            item.model_id
          ) {
            const { data: variation } =
              await supabaseAdmin
                .from(
                  "product_variations"
                )
                .select("id")
                .eq(
                  "product_id",
                  product.id
                )
                .eq(
                  "shopee_model_id",
                  Number(item.model_id)
                )
                .maybeSingle();

            variationId =
              variation?.id || null;
          }

          const { error: itemError } =
            await supabaseAdmin
              .from("order_items")
              .upsert(
                {
                  order_id:
                    savedOrder.id,

                  product_id:
                    product?.id || null,

                  variation_id:
                    variationId,

                  shopee_item_id:
                    Number(item.item_id),

                  shopee_model_id:
                    Number(
                      item.model_id || 0
                    ),

                  quantity: Number(
                    item.model_quantity ||
                      item.quantity ||
                      1
                  ),

                  unit_price: Number(
                    item.model_discounted_price ||
                      item.model_original_price ||
                      item.model_price ||
                      0
                  ),
                },
                {
                  onConflict:
                    "order_id,shopee_item_id,shopee_model_id",
                }
              );

          if (!itemError) {
            totalItems++;
          } else {
            console.error(
              "Erro salvando item:",
              itemError
            );
          }
        }
      }
    }

    hasMore =
      response?.more === true;

    cursor =
      response?.next_cursor || "";

    if (!cursor) {
      hasMore = false;
    }
  }

  return {
    orders: totalOrders,
    items: totalItems,
  };
}