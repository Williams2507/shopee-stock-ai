import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (storeError) throw storeError;

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Loja não encontrada." },
        { status: 404 }
      );
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, shopee_item_id, name")
      .eq("store_id", store.id);

    if (productsError) throw productsError;

    if (!products?.length) {
      return NextResponse.json(
        { success: false, error: "Nenhum produto disponível para a simulação." },
        { status: 400 }
      );
    }

    const productIds = products.map((product) => product.id);

    const { data: variations, error: variationsError } = await supabaseAdmin
      .from("product_variations")
      .select("id, product_id, shopee_model_id, name, price, stock")
      .in("product_id", productIds)
      .gt("stock", 0)
      .gt("price", 0);

    if (variationsError) throw variationsError;

    if (!variations?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhuma variação com estoque e preço válidos.",
        },
        { status: 400 }
      );
    }

    // Dá mais chance para itens com estoque saudável, evitando que a
    // apresentação concentre vendas apenas em SKUs quase esgotados.
    const weightedVariations = variations.flatMap((variation) => {
      const stock = Number(variation.stock || 0);
      const weight = stock >= 15 ? 5 : stock >= 8 ? 3 : stock >= 4 ? 2 : 1;
      return Array.from({ length: weight }, () => variation);
    });

    const variation =
      weightedVariations[Math.floor(Math.random() * weightedVariations.length)];

    const product = products.find(
      (item) => item.id === variation.product_id
    );

    if (!product) {
      throw new Error("Produto da variação não encontrado.");
    }

    const availableStock = Number(variation.stock || 0);
    const quantity =
      availableStock >= 10 && Math.random() < 0.18 ? 2 : 1;

    const unitPrice = Number(variation.price);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("Preço inválido para a venda simulada.");
    }

    const totalAmount = Number((unitPrice * quantity).toFixed(2));
    const orderReference = `DEMO-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const now = new Date().toISOString();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        store_id: store.id,
        shopee_order_id: orderReference,
        status: "COMPLETED",
        total_amount: totalAmount,
        order_date: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw orderError || new Error("Erro ao criar pedido simulado.");
    }

    const { error: itemError } = await supabaseAdmin
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: product.id,
        variation_id: variation.id,
        quantity,
        unit_price: unitPrice,
        shopee_item_id: product.shopee_item_id ?? null,
        shopee_model_id: variation.shopee_model_id ?? null,
      });

    if (itemError) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw itemError;
    }

    return NextResponse.json({
      success: true,
      simulation: true,
      sale: {
        orderId: orderReference,
        product: product.name,
        variation: variation.name || null,
        quantity,
        unitPrice,
        total: totalAmount,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("Erro criando venda simulada:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro criando venda simulada.",
      },
      { status: 500 }
    );
  }
}
