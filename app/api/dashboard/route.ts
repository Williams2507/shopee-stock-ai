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

    const salesProducts = Array.from(topProductsMap.values())
      .map((item) => {
        const variation = item.variation_id
          ? variations.find((candidate) => candidate.id === item.variation_id)
          : null;
        const product = products?.find(
          (candidate) => candidate.id === item.product_id
        );

        const unitCost = Number(variation?.cost ?? product?.cost ?? 0);
        const cost = Number(item.units || 0) * unitCost;
        const profit = Number(item.revenue || 0) - cost;
        const margin =
          Number(item.revenue || 0) > 0
            ? (profit / Number(item.revenue || 0)) * 100
            : 0;

        return { ...item, cost, profit, margin };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const salesProductRevenue = salesProducts.reduce(
      (total, item) => total + Number(item.revenue || 0),
      0
    );

    let cumulativeRevenueShare = 0;

    const productAnalysis = salesProducts.map((item) => {
      const revenueShare =
        salesProductRevenue > 0
          ? (Number(item.revenue || 0) / salesProductRevenue) * 100
          : 0;

      cumulativeRevenueShare += revenueShare;

      const abcClass =
        cumulativeRevenueShare <= 80
          ? "A"
          : cumulativeRevenueShare <= 95
            ? "B"
            : "C";

      return {
        ...item,
        revenue_share: Number(revenueShare.toFixed(2)),
        cumulative_revenue_share: Number(cumulativeRevenueShare.toFixed(2)),
        abc_class: abcClass,
      };
    });

    const topProducts = [...productAnalysis]
      .sort((a, b) => {
        if (b.units !== a.units) return b.units - a.units;
        return b.revenue - a.revenue;
      })
      .slice(0, 10);

    const topProfitProducts = [...productAnalysis]
      .sort((a, b) => b.profit - a.profit)
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

        const salesAnalysis =
          productAnalysis.find(
            (item) =>
              item.variation_id === variation.id
          ) ||
          productAnalysis.find(
            (item) =>
              !item.variation_id &&
              item.product_id === variation.product_id
          ) ||
          null;

        const abcClass =
          salesAnalysis?.abc_class || null;

        const salesRevenueShare =
          Number(
            salesAnalysis?.revenue_share || 0
          );

        /*
         * Prioridade operacional de compra.
         * Não altera a quantidade sugerida:
         * apenas organiza os itens que já precisam de atenção.
         *
         * Risco de ruptura tem o maior peso.
         * Depois vêm importância ABC, urgência da data
         * e quantidade sugerida.
         */
        const abcWeight =
          abcClass === "A"
            ? 300
            : abcClass === "B"
              ? 200
              : abcClass === "C"
                ? 100
                : 0;

        const orderUrgency =
          orderByDate &&
          orderByDate <=
            new Date().toISOString().slice(0, 10)
            ? 150
            : 0;

        const purchasePriorityScore =
          (riskBeforeArrival ? 1000 : 0) +
          orderUrgency +
          abcWeight +
          Math.min(suggestedPurchase, 99);

        const purchasePriority =
          riskBeforeArrival ||
          orderUrgency > 0
            ? "URGENTE"
            : abcClass === "A" &&
                suggestedPurchase > 0
              ? "ALTA"
              : suggestedPurchase > 0
                ? "NORMAL"
                : "SEM_COMPRA";

        /*
         * Saúde do estoque.
         * Excesso só é estimado quando existe histórico real de vendas.
         * Sem histórico, evitamos chamar estoque parado de "excesso".
         */
        const excessThresholdDays =
          COVERAGE_TARGET_DAYS * 2;

        const excessUnits =
          hasSalesHistory
            ? Math.max(
                stock -
                  Math.ceil(
                    averageDailySales *
                      excessThresholdDays
                  ),
                0
              )
            : 0;

        const excessCapital =
          excessUnits *
          Number(variation.cost || 0);

        const unitCost =
          Number(variation.cost || 0);

        const purchaseInvestment =
          suggestedPurchase > 0 && unitCost > 0
            ? suggestedPurchase * unitCost
            : 0;

        const hasPurchaseCost =
          suggestedPurchase === 0 || unitCost > 0;

        let stockHealth = "SAUDAVEL";

        if (riskBeforeArrival) {
          stockHealth = "RISCO_RUPTURA";
        } else if (suggestedPurchase > 0) {
          stockHealth = "COMPRAR_AGORA";
        } else if (
          hasSalesHistory &&
          excessUnits > 0
        ) {
          stockHealth = "EXCESSO";
        } else if (
          hasSalesHistory &&
          averageDailySales > 0 &&
          daysOfStock !== null &&
          daysOfStock >
            excessThresholdDays
        ) {
          stockHealth = "BAIXO_GIRO";
        } else if (!hasSalesHistory) {
          stockHealth = "SEM_HISTORICO";
        }

        return {
          ...variation,

          min_stock: minStock,

          sold_units: soldUnits,

          average_daily_sales:
            Number(
              averageDailySales.toFixed(2)
            ),

          demand_projection_7:
            hasSalesHistory
              ? Number((averageDailySales * 7).toFixed(2))
              : null,

          demand_projection_15:
            hasSalesHistory
              ? Number((averageDailySales * 15).toFixed(2))
              : null,

          demand_projection_30:
            hasSalesHistory
              ? Number((averageDailySales * 30).toFixed(2))
              : null,

          stock_target_gap:
            hasSalesHistory
              ? recommendedStock - stock
              : null,

          stock_target_status:
            !hasSalesHistory
              ? "SEM_HISTORICO"
              : stock < recommendedStock
                ? "ABAIXO_META"
                : stock > recommendedStock
                  ? "ACIMA_META"
                  : "NA_META",

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

          abc_class:
            abcClass,

          sales_revenue_share:
            salesRevenueShare,

          purchase_priority_score:
            purchasePriorityScore,

          purchase_priority:
            purchasePriority,

          stock_health:
            stockHealth,

          excess_threshold_days:
            excessThresholdDays,

          excess_units:
            excessUnits,

          excess_capital:
            Number(excessCapital.toFixed(2)),

          purchase_unit_cost:
            unitCost,

          purchase_investment:
            Number(purchaseInvestment.toFixed(2)),

          has_purchase_cost:
            hasPurchaseCost,

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
          const priorityDifference =
            Number(b.purchase_priority_score || 0) -
            Number(a.purchase_priority_score || 0);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return (
            Number(b.suggested_purchase || 0) -
            Number(a.suggested_purchase || 0)
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
    // PLANEJAMENTO DE CAIXA
    // =========================

    const purchaseCashItems =
      stockIntelligence.filter(
        (item) =>
          Number(item.suggested_purchase || 0) > 0
      );

    const purchaseCashTotal =
      purchaseCashItems.reduce(
        (total, item) =>
          total +
          Number(item.purchase_investment || 0),
        0
      );

    const urgentPurchaseCash =
      purchaseCashItems
        .filter(
          (item) =>
            item.purchase_priority === "URGENTE"
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.purchase_investment || 0),
          0
        );

    const classAPurchaseCash =
      purchaseCashItems
        .filter(
          (item) =>
            item.abc_class === "A"
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.purchase_investment || 0),
          0
        );

    const normalPurchaseCash =
      purchaseCashItems
        .filter(
          (item) =>
            item.purchase_priority === "NORMAL"
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.purchase_investment || 0),
          0
        );

    const missingCostItems =
      purchaseCashItems.filter(
        (item) =>
          !item.has_purchase_cost
      ).length;

    // =========================
    // CENTRAL DE ALERTAS
    // =========================

    const alerts = stockIntelligence.flatMap((item) => {
      const itemAlerts: any[] = [];

      if (item.risk_before_arrival) {
        itemAlerts.push({
          id: `ruptura-${item.id}`,
          variation_id: item.id,
          product_id: item.product_id,
          level: "CRITICO",
          type: "RUPTURA",
          title: "Risco de ruptura antes da reposição",
          message: `Estoque atual: ${item.stock} un. Compra sugerida: ${item.suggested_purchase} un.`,
          action: "Priorizar reposição",
          order_by_date: item.order_by_date,
        });
      }

      if (
        Number(item.suggested_purchase || 0) > 0 &&
        item.order_by_date &&
        item.order_by_date <= new Date().toISOString().slice(0, 10)
      ) {
        itemAlerts.push({
          id: `pedido-${item.id}`,
          variation_id: item.id,
          product_id: item.product_id,
          level: "CRITICO",
          type: "PEDIDO_HOJE",
          title: "Pedido precisa ser feito agora",
          message: `Reposição sugerida: ${item.suggested_purchase} un.`,
          action: "Preparar pedido de compra",
          order_by_date: item.order_by_date,
        });
      }

      if (item.low_manual_stock) {
        itemAlerts.push({
          id: `minimo-${item.id}`,
          variation_id: item.id,
          product_id: item.product_id,
          level: "ATENCAO",
          type: "ABAIXO_MINIMO",
          title: "Estoque abaixo do mínimo",
          message: `Atual: ${item.stock} un. Mínimo: ${item.min_stock} un.`,
          action: "Revisar reposição",
        });
      }

      if (
        Number(item.suggested_purchase || 0) > 0 &&
        !item.has_purchase_cost
      ) {
        itemAlerts.push({
          id: `custo-${item.id}`,
          variation_id: item.id,
          product_id: item.product_id,
          level: "ATENCAO",
          type: "SEM_CUSTO",
          title: "Custo não cadastrado",
          message: "Não é possível calcular corretamente o caixa necessário para este SKU.",
          action: "Cadastrar custo",
        });
      }

      if (item.stock_health === "EXCESSO") {
        itemAlerts.push({
          id: `excesso-${item.id}`,
          variation_id: item.id,
          product_id: item.product_id,
          level: "INFO",
          type: "EXCESSO",
          title: "Possível excesso de estoque",
          message: `${item.excess_units} un. acima da cobertura estimada, representando ${Number(item.excess_capital || 0).toFixed(2)} em custo.`,
          action: "Revisar compra e giro",
        });
      }

      if (
        item.abc_class === "A" &&
        (
          item.purchase_priority === "URGENTE" ||
          item.purchase_priority === "ALTA"
        )
      ) {
        itemAlerts.push({
          id: `abc-a-${item.id}`,
          variation_id: item.id,
          product_id: item.product_id,
          level: item.purchase_priority === "URGENTE" ? "CRITICO" : "ATENCAO",
          type: "ABC_A",
          title: "Produto Classe A exige atenção",
          message: `Prioridade de compra: ${item.purchase_priority === "URGENTE" ? "Urgente" : "Alta"}.`,
          action: "Priorizar este SKU",
          order_by_date: item.order_by_date,
        });
      }

      return itemAlerts;
    }).sort((a, b) => {
      const weight: Record<string, number> = {
        CRITICO: 3,
        ATENCAO: 2,
        INFO: 1,
      };

      return (weight[b.level] || 0) - (weight[a.level] || 0);
    });

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
        topProfitProducts,
        productAnalysis,
        recentOrders,
      },

      alerts: {
        total: alerts.length,
        critical: alerts.filter((alert) => alert.level === "CRITICO").length,
        attention: alerts.filter((alert) => alert.level === "ATENCAO").length,
        info: alerts.filter((alert) => alert.level === "INFO").length,
        items: alerts,
      },

      executiveInsights: {
        revenue: Number(revenue || 0),
        grossProfit: Number(grossProfit || 0),
        orders: validOrders.length,
        units: Number(unitsSold || 0),
        riskSkus: stockIntelligence.filter(
          (item) => item.stock_health === "RISCO_RUPTURA"
        ).length,
        urgentSkus: stockIntelligence.filter(
          (item) => item.purchase_priority === "URGENTE"
        ).length,
        criticalClassA: stockIntelligence.filter(
          (item) =>
            item.abc_class === "A" &&
            (
              item.purchase_priority === "URGENTE" ||
              item.purchase_priority === "ALTA"
            )
        ).length,
        purchaseInvestment: Number(purchaseCashTotal.toFixed(2)),
        excessCapital: Number(
          stockIntelligence.reduce(
            (total, item) =>
              total + Number(item.excess_capital || 0),
            0
          ).toFixed(2)
        ),
        nextOrderDates: stockIntelligence
          .filter(
            (item) =>
              Number(item.suggested_purchase || 0) > 0 &&
              item.order_by_date
          )
          .sort((a, b) =>
            String(a.order_by_date).localeCompare(
              String(b.order_by_date)
            )
          )
          .slice(0, 5)
          .map((item) => ({
            variation_id: item.id,
            product_id: item.product_id,
            order_by_date: item.order_by_date,
            suggested_purchase: item.suggested_purchase,
            abc_class: item.abc_class,
            purchase_priority: item.purchase_priority,
          })),
      },

      purchaseCash: {
        total: Number(purchaseCashTotal.toFixed(2)),
        urgent: Number(urgentPurchaseCash.toFixed(2)),
        classA: Number(classAPurchaseCash.toFixed(2)),
        normal: Number(normalPurchaseCash.toFixed(2)),
        missingCostItems,
        itemCount: purchaseCashItems.length,
        totalUnits: purchaseCashItems.reduce(
          (total, item) =>
            total + Number(item.suggested_purchase || 0),
          0
        ),
      },

      stockHealth: {
        risk: stockIntelligence.filter(
          (item) => item.stock_health === "RISCO_RUPTURA"
        ).length,
        buyNow: stockIntelligence.filter(
          (item) => item.stock_health === "COMPRAR_AGORA"
        ).length,
        healthy: stockIntelligence.filter(
          (item) => item.stock_health === "SAUDAVEL"
        ).length,
        slowMoving: stockIntelligence.filter(
          (item) => item.stock_health === "BAIXO_GIRO"
        ).length,
        excess: stockIntelligence.filter(
          (item) => item.stock_health === "EXCESSO"
        ).length,
        noHistory: stockIntelligence.filter(
          (item) => item.stock_health === "SEM_HISTORICO"
        ).length,
        excessUnits: stockIntelligence.reduce(
          (total, item) =>
            total + Number(item.excess_units || 0),
          0
        ),
        excessCapital: stockIntelligence.reduce(
          (total, item) =>
            total + Number(item.excess_capital || 0),
          0
        ),
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