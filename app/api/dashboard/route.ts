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
    // PEDIDOS
    // =========================

    const startDate = new Date();

    startDate.setDate(
      startDate.getDate() - selectedPeriod
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
        startDate.toISOString()
      )
      .order("order_date", {
        ascending: false,
      });

    if (ordersError) {
      throw ordersError;
    }

    // Não usamos pedidos cancelados
    // na previsão de vendas.
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
    // ITENS DOS PEDIDOS
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
        const variationItems =
          orderItems.filter(
            (item) =>
              item.variation_id ===
              variation.id
          );

        const soldUnits =
          variationItems.reduce(
            (total, item) =>
              total +
              Number(item.quantity || 0),
            0
          );

        // Média de unidades vendidas por dia
        // dentro do período selecionado.
        const averageDailySales =
          soldUnits / selectedPeriod;

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

      lowStock,

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