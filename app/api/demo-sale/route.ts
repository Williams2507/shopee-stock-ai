import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    // =========================
    // LOJA DO USUÁRIO
    // =========================

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada.",
        },
        { status: 404 }
      );
    }

    // =========================
    // PRODUTOS
    // =========================

    const { data: products, error: productsError } =
      await supabaseAdmin
        .from("products")
        .select("id, shopee_item_id, name")
        .eq("store_id", store.id);

    if (productsError) {
      throw productsError;
    }

    if (!products?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum produto disponível para a demonstração.",
        },
        { status: 400 }
      );
    }

    const productIds = products.map((product) => product.id);

    // =========================
    // VARIAÇÕES
    // =========================

    const { data: variations, error: variationsError } =
      await supabaseAdmin
        .from("product_variations")
        .select(
          "id, product_id, shopee_model_id, name, price, stock"
        )
        .in("product_id", productIds)
        .gt("stock", 0);

    if (variationsError) {
      throw variationsError;
    }

    if (!variations?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhuma variação com estoque disponível.",
        },
        { status: 400 }
      );
    }

    // =========================
    // ESCOLHER ITEM
    // =========================

    const variation =
      variations[
        Math.floor(Math.random() * variations.length)
      ];

    const product = products.find(
      (item) => item.id === variation.product_id
    );

    if (!product) {
      throw new Error("Produto da variação não encontrado.");
    }

    // Normalmente 1 unidade.
    // Ocasionalmente 2, se houver estoque.
    const quantity =
      Number(variation.stock || 0) >= 2 &&
      Math.random() < 0.2
        ? 2
        : 1;

    const unitPrice = Number(variation.price || 0);

    if (unitPrice <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Produto selecionado está sem preço.",
        },
        { status: 400 }
      );
    }

    const totalAmount = Number(
      (unitPrice * quantity).toFixed(2)
    );

    // Prefixo permite remover todas as vendas demo depois.
    const demoOrderId =
      `DEMO-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

    const now = new Date().toISOString();

    // =========================
    // CRIAR PEDIDO DEMO
    // =========================

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .insert({
          store_id: store.id,
          shopee_order_id: demoOrderId,
          status: "COMPLETED",
          total_amount: totalAmount,
          order_date: now,
          updated_at: now,
        })
        .select()
        .single();

    if (orderError || !order) {
      throw orderError || new Error("Erro criando pedido demo.");
    }

    // =========================
    // CRIAR ITEM
    // =========================

    const { error: itemError } =
      await supabaseAdmin
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: product.id,
          variation_id: variation.id,
          quantity,
          unit_price: unitPrice,
          shopee_item_id:
            product.shopee_item_id ?? null,
          shopee_model_id:
            variation.shopee_model_id ?? null,
        });

    if (itemError) {
      // Não deixa pedido sem item.
      await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", order.id);

      throw itemError;
    }

    return NextResponse.json({
      success: true,

      demo: true,

      sale: {
        orderId: demoOrderId,
        product: product.name,
        variation: variation.name || null,
        quantity,
        unitPrice,
        total: totalAmount,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("Erro criando venda demo:", error);

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro criando venda demo.",
      },
      { status: 500 }
    );
  }
}