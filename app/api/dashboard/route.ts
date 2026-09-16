import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const period = Number(
      searchParams.get("period") || 30
    );

    const validPeriods = [1, 7, 30, 90];

    const selectedPeriod = validPeriods.includes(period)
      ? period
      : 30;

    // A previsão de estoque usa sempre uma janela fixa,
    // independente do filtro visual de Performance.
    const STOCK_FORECAST_DAYS = 30;



    // =========================
    // LOJA
    // =========================

    const { data: store, error: storeError } =
      await supabaseAdmin
        .from("stores")
        .select(
          "id, shop_id, shop_name, lead_time_days, safety_days"
        )
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

    // =========================
    // CONFIGURAÇÃO DE REPOSIÇÃO
    // =========================

    const LEAD_TIME_DAYS = Number(
      store.lead_time_days ?? 14
    );

    const SAFETY_DAYS = Number(
      store.safety_days ?? 7
    );

    const COVERAGE_TARGET_DAYS =
      LEAD_TIME_DAYS + SAFETY_DAYS;
    // =========================
    // PRODUTOS
    // =========================

    const {
      data: products,
      error: productsError,
    } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("store_id", store.id);

    if (productsError) {
      throw productsError;
    }

    const productIds =
      products?.map((product) => product.id) || [];

    // =========================
    // VARIAÇÕES
    // =========================

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

    // =========================
    // HISTÓRICO DE ESTOQUE
    // =========================

    let stockHistory: any[] = [];

    const variationIds = variations.map((variation) => variation.id);

    if (variationIds.length > 0) {
      const historyStartDate = new Date();
      historyStartDate.setDate(historyStartDate.getDate() - 30);

      const { data: historyData, error: historyError } =
        await supabaseAdmin
          .from("stock_history")
          .select("variation_id, stock, snapshot_date, created_at")
          .in("variation_id", variationIds)
          .gte("snapshot_date", historyStartDate.toISOString().slice(0, 10))
          .order("snapshot_date", { ascending: true });

      if (historyError) {
        throw historyError;
      }

      stockHistory = historyData || [];
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
          (Number(variation.price || 0) -
            Number(variation.cost || 0)),
      0
    );

    // =========================
    // PEDIDOS DE PERFORMANCE
    // =========================

    const performanceStartDate = new Date();

    performanceStartDate.setDate(
      performanceStartDate.getDate() - selectedPeriod
    );

    const {
      data: orders,
      error: ordersError,
    } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("store_id", store.id)
      .gte(
        "order_date",
        performanceStartDate.toISOString()
      )
      .order("order_date", {
        ascending: false,
      });

    if (ordersError) {
      throw ordersError;
    }

    const validOrders =
      orders?.filter(
        (order) =>
          ![
            "CANCELLED",
            "IN_CANCEL",
          ].includes(order.status)
      ) || [];

    const orderIds = validOrders.map(
      (order) => order.id
    );

    // =========================
    // ITENS DA PERFORMANCE
    // =========================

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
    // PEDIDOS DA PREVISÃO
    // =========================

    const forecastStartDate = new Date();

    forecastStartDate.setDate(
      forecastStartDate.getDate() - STOCK_FORECAST_DAYS
    );

    const {
      data: forecastOrders,
      error: forecastOrdersError,
    } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("store_id", store.id)
      .gte(
        "order_date",
        forecastStartDate.toISOString()
      );

    if (forecastOrdersError) {
      throw forecastOrdersError;
    }

    const validForecastOrders =
      forecastOrders?.filter(
        (order) =>
          ![
            "CANCELLED",
            "IN_CANCEL",
          ].includes(order.status)
      ) || [];

    const forecastOrderIds =
      validForecastOrders.map(
        (order) => order.id
      );

    let forecastOrderItems: any[] = [];

    if (forecastOrderIds.length > 0) {
      const { data, error } =
        await supabaseAdmin
          .from("order_items")
          .select("*")
          .in("order_id", forecastOrderIds);

      if (error) {
        throw error;
      }

      forecastOrderItems = data || [];
    }

    // =========================
    // FATURAMENTO
    // =========================

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
    let unitsSold = 0;

    for (const item of orderItems) {
      const quantity = Number(
        item.quantity || 0
      );

      unitsSold += quantity;

      if (item.variation_id) {
        const variation = variations.find(
          (v) =>
            v.id === item.variation_id
        );

        if (variation) {
          productCost +=
            quantity *
            Number(variation.cost || 0);
        }
      } else if (item.product_id) {
        const product = products?.find(
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

    // =========================
    // INTELIGÊNCIA DE VENDAS
    // =========================

    const dailySalesMap = new Map<
      string,
      { date: string; revenue: number; orders: number; units: number }
    >();

    for (const order of validOrders) {
      const rawDate = order.order_date;
      if (!rawDate) continue;

      const date = new Date(rawDate).toISOString().slice(0, 10);
      const current = dailySalesMap.get(date) || {
        date,
        revenue: 0,
        orders: 0,
        units: 0,
      };

      current.revenue += Number(order.total_amount || 0);
      current.orders += 1;

      const itemsForOrder = orderItems.filter(
        (item) => item.order_id === order.id
      );

      current.units += itemsForOrder.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      );

      dailySalesMap.set(date, current);
    }

    const dailySales = Array.from(dailySalesMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    const topProductsMap = new Map<string, any>();

    for (const item of orderItems) {
      const product = products?.find(
        (candidate) => candidate.id === item.product_id
      );

      const variation = item.variation_id
        ? variations.find(
            (candidate) => candidate.id === item.variation_id
          )
        : null;

      const key = item.variation_id
        ? `variation:${item.variation_id}`
        : `product:${item.product_id || "unknown"}`;

      const quantity = Number(item.quantity || 0);

      // Preferimos o valor registrado no item do pedido quando existir.
      // Caso o schema não tenha subtotal/preço do item, usamos o preço
      // cadastrado apenas como estimativa visual do ranking.
      const itemRevenue =
        Number(item.subtotal || 0) ||
        Number(item.total_price || 0) ||
        quantity *
          Number(
            item.price ||
              variation?.price ||
              product?.price ||
              0
          );

      const current = topProductsMap.get(key) || {
        product_id: item.product_id || null,
        variation_id: item.variation_id || null,
        name: product?.name || "Produto",
        variation_name: variation?.name || null,
        sku: variation?.sku || product?.sku || "",
        units: 0,
        revenue: 0,
      };

      current.units += quantity;
      current.revenue += itemRevenue;

      topProductsMap.set(key, current);
    }

    const topProducts = Array.from(topProductsMap.values())
      .sort((a, b) => {
        if (b.units !== a.units) {
          return b.units - a.units;
        }

        return b.revenue - a.revenue;
      })
      .slice(0, 10);

    const recentOrders = validOrders.slice(0, 20).map((order) => {
      const itemsForOrder = orderItems.filter(
        (item) => item.order_id === order.id
      );

      return {
        ...order,
        units: itemsForOrder.reduce(
          (total, item) =>
            total + Number(item.quantity || 0),
          0
        ),
      };
    });

    // =========================
    // INTELIGÊNCIA DE ESTOQUE
    // =========================

    const stockIntelligence = variations.map(
      (variation) => {
        const stock = Number(
          variation.stock || 0
        );

        const minStock = Number(
          variation.min_stock ?? 5
        );

        // Busca todos os itens vendidos
        // referentes a esta variação.
        const productVariations =
          variations.filter(
            (candidate) =>
              candidate.product_id ===
              variation.product_id
          );

        const variationItems =
          forecastOrderItems.filter(
            (item) => {
              if (
                item.variation_id ===
                variation.id
              ) {
                return true;
              }

              // Produtos sem variação podem chegar do pedido
              // somente com product_id. Nesse caso, atribuímos
              // a venda à única variação virtual do produto.
              return (
                !item.variation_id &&
                item.product_id ===
                  variation.product_id &&
                productVariations.length === 1
              );
            }
          );

        const soldUnits =
          variationItems.reduce(
            (total, item) =>
              total +
              Number(item.quantity || 0),
            0
          );

        // Média diária usada exclusivamente pela previsão.
        // Ela não muda quando o usuário troca o filtro
        // de Performance entre Hoje / 7 / 30 / 90 dias.
        const averageDailySales =
          soldUnits / STOCK_FORECAST_DAYS;

        // Quantos dias o estoque atual
        // deve durar mantendo a média atual.
        const daysOfStock =
          averageDailySales > 0
            ? stock / averageDailySales
            : null;

        // Quantidade estimada que será vendida
        // enquanto o novo pedido estiver chegando.
        const leadTimeDemand =
          averageDailySales *
          LEAD_TIME_DAYS;

        // Reserva adicional para 7 dias.
        const safetyStock =
          averageDailySales *
          SAFETY_DAYS;

        // Estoque para cobrir:
        // 14 dias de entrega
        // +
        // 7 dias de segurança.
        const intelligentTarget =
          averageDailySales *
          COVERAGE_TARGET_DAYS;

        // A inteligência nunca recomenda
        // estoque menor que o mínimo manual
        // configurado pelo usuário.
        const recommendedStock = Math.max(
          minStock,
          Math.ceil(intelligentTarget)
        );

        // Quantidade sugerida para comprar.
        const suggestedPurchase = Math.max(
          recommendedStock - stock,
          0
        );

        // Existe risco de ruptura quando
        // o estoque acaba antes ou exatamente
        // no prazo estimado da entrega.
        const riskBeforeArrival =
          averageDailySales > 0 &&
          daysOfStock !== null &&
          daysOfStock <= LEAD_TIME_DAYS;

        // Alerta manual baseado no mínimo
        // configurado no Dashboard.
        const lowManualStock =
          stock <= minStock;

        /*
         * Sem histórico de vendas,
         * não inventamos demanda.
         *
         * Nesse caso, o mínimo manual
         * continua sendo a referência.
         */
        const hasSalesHistory =
          soldUnits > 0;

        const needsAttention =
          lowManualStock ||
          riskBeforeArrival ||
          (
            hasSalesHistory &&
            suggestedPurchase > 0
          );

        // Datas operacionais. Só calculamos quando existe
        // histórico real de vendas; sem histórico, não inventamos demanda.
        let estimatedStockoutDate: string | null = null;
        let orderByDate: string | null = null;

        if (hasSalesHistory && daysOfStock !== null) {
          const stockout = new Date();
          stockout.setDate(stockout.getDate() + Math.ceil(daysOfStock));
          estimatedStockoutDate = stockout.toISOString().slice(0, 10);

          const daysUntilOrder = Math.max(
            Math.floor(daysOfStock - COVERAGE_TARGET_DAYS),
            0
          );
          const orderDate = new Date();
          orderDate.setDate(orderDate.getDate() + daysUntilOrder);
          orderByDate = orderDate.toISOString().slice(0, 10);
        }

        const variationHistory = stockHistory.filter(
          (entry) => entry.variation_id === variation.id
        );

        return {
          ...variation,

          min_stock: minStock,

          sold_units: soldUnits,

          average_daily_sales:
            Number(
              averageDailySales.toFixed(2)
            ),

          days_of_stock:
            daysOfStock === null
              ? null
              : Number(
                  daysOfStock.toFixed(1)
                ),

          lead_time_days:
            LEAD_TIME_DAYS,

          safety_days:
            SAFETY_DAYS,

          coverage_target_days:
            COVERAGE_TARGET_DAYS,

          lead_time_demand:
            Math.ceil(leadTimeDemand),

          safety_stock:
            Math.ceil(safetyStock),

          recommended_stock:
            recommendedStock,

          suggested_purchase:
            suggestedPurchase,

          risk_before_arrival:
            riskBeforeArrival,

          low_manual_stock:
            lowManualStock,

          has_sales_history:
            hasSalesHistory,

          needs_attention:
            needsAttention,

          estimated_stockout_date:
            estimatedStockoutDate,

          order_by_date:
            orderByDate,

          stock_history:
            variationHistory,
        };
      }
    );

    // =========================
    // ALERTAS DE ESTOQUE
    // =========================

    const lowStock =
      stockIntelligence
        .filter(
          (variation) =>
            variation.needs_attention
        )
        .sort((a, b) => {
          /*
           * Primeiro mostramos produtos
           * com risco de acabar antes
           * da reposição chegar.
           */
          if (
            a.risk_before_arrival !==
            b.risk_before_arrival
          ) {
            return a.risk_before_arrival
              ? -1
              : 1;
          }

          /*
           * Depois ordenamos pela maior
           * necessidade de compra.
           */
          return (
            Number(
              b.suggested_purchase || 0
            ) -
            Number(
              a.suggested_purchase || 0
            )
          );
        });

    // =========================
    // LUCRO
    // =========================

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
    // RESPOSTA
    // =========================

    return NextResponse.json({
      success: true,

      period: selectedPeriod,

      stockSettings: {
        leadTimeDays:
          LEAD_TIME_DAYS,

        safetyDays:
          SAFETY_DAYS,

        coverageTargetDays:
          COVERAGE_TARGET_DAYS,

        forecastDays:
          STOCK_FORECAST_DAYS,
      },

      store: {
        id: store.id,
        shopId: store.shop_id,
        name:
          store.shop_name ||
          "Minha loja Shopee",
      },

      metrics: {
        products:
          products?.length || 0,

        variations:
          stockIntelligence.length,

        totalStock,

        inventoryValue,

        potentialProfit,

        revenue,

        orders:
          orderCount,

        unitsSold,

        productCost,

        grossProfit,

        averageOrderValue,

        margin,
      },

      sales: {
        daily: dailySales,
        topProducts,
        recentOrders,
      },

      lowStock,

      stockHistory,

      products:
        products || [],

      /*
       * Agora as variações retornam também
       * todos os dados da inteligência.
       */
      variations:
        stockIntelligence,

      orders:
        orders || [],

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