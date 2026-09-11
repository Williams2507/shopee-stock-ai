import { shopeeGet } from "./api";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function syncReviews(store: any) {
  let offset = 0;
  const pageSize = 50;

  let totalShopee = 0;
  let savedReviews = 0;

  while (true) {
    const data = await shopeeGet(
      "/api/v2/product/get_rating_list",
      store,
      {
        offset: offset.toString(),
        page_size: pageSize.toString(),
        rating_star: "0",
      }
    );

    const response = data.response;

    const reviews =
      response?.ratings ||
      response?.rating_list ||
      [];

    if (reviews.length === 0) {
      break;
    }

    totalShopee += reviews.length;

    for (const review of reviews) {
      const reviewId = Number(
        review.rating_id ||
          review.review_id ||
          0
      );

      if (!reviewId) {
        continue;
      }

      const rating = Number(
        review.rating_star || 0
      );

      const comment =
        review.comment || "";

      const { error } =
        await supabaseAdmin
          .from("reviews")
          .upsert(
            {
              store_id: store.id,

              shopee_review_id:
                reviewId,

              shopee_item_id:
                review.item_id
                  ? Number(review.item_id)
                  : null,

              shopee_model_id:
                review.model_id
                  ? Number(review.model_id)
                  : null,

              order_sn:
                review.order_sn ||
                null,

              username:
                review.author_username ||
                review.username ||
                null,

              rating,

              comment,

              review_time:
                review.create_time
                  ? new Date(
                      Number(
                        review.create_time
                      ) * 1000
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

    if (
      response?.has_next_page !== true &&
      response?.more !== true
    ) {
      break;
    }

    offset += pageSize;
  }

  return {
    totalShopee,
    savedReviews,
  };
}