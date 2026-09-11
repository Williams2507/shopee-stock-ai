import { supabaseAdmin } from "@/lib/supabase/server";

export async function generateReviewResponse(
  review: any
) {
  const { data: templates, error } =
    await supabaseAdmin
      .from("review_templates")
      .select("id, message")
      .eq("store_id", review.store_id)
      .eq("rating", review.rating)
      .eq("active", true);

  if (error) {
    throw error;
  }

  if (!templates || templates.length === 0) {
    throw new Error(
      `Nenhuma mensagem cadastrada para ${review.rating} estrelas.`
    );
  }

  // Escolhe uma mensagem aleatoriamente
  const template =
    templates[
      Math.floor(
        Math.random() * templates.length
      )
    ];

  const { error: updateError } =
    await supabaseAdmin
      .from("reviews")
      .update({
        ai_response: template.message,
        edited_response: null,
        response_status: "PENDING",
        response_error: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", review.id);

  if (updateError) {
    throw updateError;
  }

  return template.message;
}