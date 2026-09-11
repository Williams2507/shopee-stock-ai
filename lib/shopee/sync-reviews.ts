import { shopeeGet } from "./api";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function syncReviews(store: any) {
  let cursor = "";
  let totalShopee = 0;
  let savedReviews = 0;

  // Pega os produtos da loja
  const { data: products, error: productsError } =
    await supabaseAdmin
      .from("products")
      .select("id, shopee_item_id")
      .eq("store_id", store.id);

  if (productsError) {
    throw productsError;
  }

  for (const product of products || []) {
    cursor = "";

    while (true) {
      const params: Record<string, string> = {
        item_id: String(product.shopee_item_id),
        cursor,
        page_size: "100",
      };

      const data = await shopeeGet(
        "/api/v2/product/get_comment",
        store,
        params
      );

      const response = data.response;

      const comments =
        response?.item_comment_list || [];

      totalShopee += comments.length;

      for (const comment of comments) {
        const reviewId = Number(
          comment.comment_id || 0
        );

        if (!reviewId) {
          continue;
        }

        const rating = Number(
          comment.rating_star || 0
        );

        const { error } =
          await supabaseAdmin
            .from("reviews")
            .upsert(
              {
                store_id: store.id,
                shopee_review_id: reviewId,
                shopee_item_id:
                  Number(
                    comment.item_id ||
                      product.shopee_item_id
                  ),
                shopee_model_id:
                  comment.model_id
                    ? Number(comment.model_id)
                    : null,
                username:
                  comment.buyer_username ||
                  null,
                rating,
                comment:
                  comment.comment || "",
                review_time:
                  comment.ctime
                    ? new Date(
                        Number(comment.ctime) *
                          1000
                      ).toISOString()
                    : null,
                updated_at:
                  new Date().toISOString(),
              },
              {
                onConflict:
                  "store_id,shopee_review_id",
              }
            );

        if (error) {
          console.error(
            "Erro salvando avaliação:",
            error
          );
          continue;
        }

        savedReviews++;
      }

      if (response?.more !== true) {
        break;
      }

      cursor =
        response?.next_cursor || "";

      if (!cursor) {
        break;
      }
    }
  }

  return {
    totalShopee,
    savedReviews,
  };
}