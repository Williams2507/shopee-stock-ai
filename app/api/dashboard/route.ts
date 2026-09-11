import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select("id, shop_id, shop_name")
        .eq("shop_id", 227703795)
        .single();

    if (storeError || !store) {
      return NextResponse.json(
        {
          success: false,
          error: "Loja não encontrada.",
        },
        { status: 404 }
      );
    }

    // Produtos
    const { data: products, error: productsError } =
      await supabaseAdmin
        .from("products")
        .select("*")
        .eq("store_id", store.id);

    if (productsError) {
      throw productsError;
    }

    // Variações
    const productIds =
      products?.map((product) => product.id) || [];

    let variations: any[] = [];

    if (productIds.length > 0) {
      const { data, error } =
        await supabaseAdmin
          .from("product_variations")
          .select("*")
          .in("product_id", productIds);

      if (error) {
        throw error;
      }

      variations = data || [];
    }

    // Pedidos
    const { data: orders, error: ordersError } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("store_id", store.id);

    if (ordersError) {
      throw ordersError;
    }

    // Itens dos pedidos
    const orderIds =
      orders?.map((order) => order.id) || [];

    let orderItems: any[] = [];

    if (orderIds.length > 0) {
      const { data, error } =
        await supabaseAdmin
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);

      if (error) {
        throw error;
      }

      orderItems = data || [];
    }

    // =========================
    // ESTOQUE
    // =========================

    const totalStock = variations.reduce(
      (total, variation) =>
        total + Number(variation.stock || 0),
      0
    );

    const inventoryValue = variations.reduce(
      (total, variation) =>
        total +
        Number(variation.stock || 0) *
          Number(variation.cost || 0),
      0
    );

    const potentialProfit = variations.reduce(
      (total, variation) =>
        total +
        Number(variation.stock || 0) *
          (
            Number(variation.price || 0) -
            Number(variation.cost || 0)
          ),
      0
    );

    const lowStock = variations
      .filter(
        (variation) =>
          Number(variation.stock || 0) <= 5
      )
      .sort(
        (a, b) =>
          Number(a.stock || 0) -
          Number(b.stock || 0)
      );

    // =========================
    // VENDAS
    // =========================

    const validOrders =
      orders?.filter(
        (order) =>
          ![
            "CANCELLED",
            "IN_CANCEL",
          ].includes(order.status)
      ) || [];

    const revenue = validOrders.reduce(
      (total, order) =>
        total +
        Number(order.total_amount || 0),
      0
    );

    const orderCount = validOrders.length;

    // =========================
    // CUSTO DOS PRODUTOS
    // =========================

    let productCost = 0;

    for (const item of orderItems) {
      const quantity =
        Number(item.quantity || 0);

      if (item.variation_id) {
        const variation =
          variations.find(
            (v) =>
              v.id === item.variation_id
          );

        if (variation) {
          productCost +=
            quantity *
            Number(variation.cost || 0);
        }
      } else if (item.product_id) {
        const product =
          products?.find(
            (p) =>
              p.id === item.product_id
          );

        if (product) {
          productCost +=
            quantity *
            Number(product.cost || 0);
        }
      }
    }

    const grossProfit =
      revenue - productCost;

    const averageOrderValue =
      orderCount > 0
        ? revenue / orderCount
        : 0;

    const margin =
      revenue > 0
        ? (grossProfit / revenue) * 100
        : 0;

    // =========================
    // RESUMO
    // =========================

    return NextResponse.json({
      success: true,

      store: {
        id: store.id,
        shopId: store.shop_id,
        name:
          store.shop_name ||
          "Minha loja Shopee",
      },

      metrics: {
        products: products?.length || 0,

        variations: variations.length,

        totalStock,

        inventoryValue,

        potentialProfit,

        revenue,

        orders: orderCount,

        productCost,

        grossProfit,

        averageOrderValue,

        margin,
      },

      lowStock,

      products: products || [],

      variations,

      orders: orders || [],

      orderItems,
    });
  } catch (error) {
    console.error(
      "Erro carregando dashboard:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar dashboard.",
      },
      { status: 500 }
    );
  }
}