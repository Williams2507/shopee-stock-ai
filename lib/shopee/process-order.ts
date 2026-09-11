import { supabaseAdmin } from "@/lib/supabase/server";

export async function processOrder(
  store: any,
  order: any
) {
  const items = order.item_list || [];

  for (const item of items) {
    const itemId = Number(item.item_id);
    const modelId = Number(item.model_id || 0);

    const quantity = Number(
      item.model_quantity ||
        item.quantity ||
        1
    );

    // Procura o produto
    const { data: product } =
      await supabaseAdmin
        .from("products")
        .select("id")
        .eq("store_id", store.id)
        .eq("shopee_item_id", itemId)
        .maybeSingle();

    if (!product) {
      console.warn(
        `Produto Shopee ${itemId} não encontrado.`
      );
      continue;
    }

    // Procura a variação
    const { data: variation } =
      await supabaseAdmin
        .from("product_variations")
        .select("id")
        .eq("product_id", product.id)
        .eq("shopee_model_id", modelId)
        .maybeSingle();

    if (!variation) {
      console.warn(
        `Variação ${modelId} não encontrada.`
      );
      continue;
    }

    // Identificador único dessa venda
    const referenceId =
      `${order.order_sn}-${itemId}-${modelId}`;

    // Evita registrar a mesma venda duas vezes
    const { data: existingMovement } =
      await supabaseAdmin
        .from("inventory_movements")
        .select("id")
        .eq("store_id", store.id)
        .eq("reference_id", referenceId)
        .maybeSingle();

    if (existingMovement) {
      continue;
    }

    // Registra a movimentação.
    // O estoque NÃO é alterado aqui.
    // O syncProducts mantém o estoque igual ao da Shopee.
    const { error: movementError } =
      await supabaseAdmin
        .from("inventory_movements")
        .insert({
          store_id: store.id,
          product_id: product.id,
          variation_id: variation.id,
          type: "SALE",
          quantity: -quantity,
          reason: "Venda Shopee",
          reference_id: referenceId,
        });

    if (movementError) {
      throw movementError;
    }
  }

  return true;
}