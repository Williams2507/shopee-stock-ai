"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  success: boolean;

  period: number;

  stockSettings: {
    leadTimeDays: number;
    safetyDays: number;
    coverageTargetDays: number;
    forecastDays?: number;
  };

  products: any[];
  variations: any[];
  orderItems: any[];
  orders?: any[];
  sales?: {
    daily: any[];
    topProducts: any[];
    topProfitProducts?: any[];
    productAnalysis?: any[];
    recentOrders: any[];
  };

  metrics: {
    products: number;
    variations: number;
    totalStock: number;
    inventoryValue: number;
    potentialProfit: number;
    revenue: number;
    orders: number;
    unitsSold: number;
    productCost: number;
    grossProfit: number;
    averageOrderValue: number;
    margin: number;
  };

  lowStock: any[];
  stockHistory?: any[];
  alerts?: {
    total: number;
    critical: number;
    attention: number;
    info: number;
    items: any[];
  };
  executiveInsights?: {
    revenue: number;
    grossProfit: number;
    orders: number;
    units: number;
    riskSkus: number;
    urgentSkus: number;
    criticalClassA: number;
    purchaseInvestment: number;
    excessCapital: number;
    nextOrderDates: any[];
  };
  purchaseCash?: {
    total: number;
    urgent: number;
    classA: number;
    normal: number;
    missingCostItems: number;
    itemCount: number;
    totalUnits?: number;
  };
  stockHealth?: {
    risk: number;
    buyNow: number;
    healthy: number;
    slowMoving: number;
    excess: number;
    noHistory: number;
    excessUnits: number;
    excessCapital: number;
  };
};


type Review = {
  id: string;
  shopee_review_id: number;
  username: string | null;
  rating: number;
  comment: string | null;
  ai_response: string | null;
  edited_response: string | null;
  response_status: string;
  response_error: string | null;
  review_time: string | null;
  is_test: boolean;
};

export default function Home() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [period, setPeriod] =
    useState(30);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<"dashboard" | "sales" | "purchases" | "reviews">("dashboard");

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [reviewsLoading, setReviewsLoading] =
    useState(false);

  const [reviewsMessage, setReviewsMessage] =
    useState("");

  const [editingReview, setEditingReview] =
    useState<string | null>(null);

  const [sendingReview, setSendingReview] =
    useState<string | null>(null);

  const [savingMinimum, setSavingMinimum] =
    useState<string | null>(null);

  const [stockMessage, setStockMessage] =
    useState("");

  const [savingStockSettings, setSavingStockSettings] =
    useState(false);

  async function loadDashboard(
    selectedPeriod = period
  ) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/dashboard?period=${selectedPeriod}`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Erro ao carregar dashboard."
        );
      }

      setData(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Erro desconhecido."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard(period);
  }, [period]);


  async function loadReviews() {
    try {
      setReviewsLoading(true);
      setReviewsMessage("");

      const response = await fetch(
        "/api/reviews",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Erro ao carregar avaliações."
        );
      }

      setReviews(result.reviews || []);
    } catch (error) {
      setReviewsMessage(
        error instanceof Error
          ? error.message
          : "Erro ao carregar avaliações."
      );
    } finally {
      setReviewsLoading(false);
    }
  }

  async function syncReviews() {
    try {
      setReviewsLoading(true);
      setReviewsMessage("Sincronizando avaliações...");

      const response = await fetch(
        "/api/shopee/reviews",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Erro ao sincronizar avaliações."
        );
      }

      await loadReviews();

      setReviewsMessage(
        `${result.savedReviews || 0} avaliação(ões) sincronizada(s).`
      );
    } catch (error) {
      setReviewsMessage(
        error instanceof Error
          ? error.message
          : "Erro ao sincronizar avaliações."
      );
      setReviewsLoading(false);
    }
  }

  async function createTestReview() {
    try {
      setReviewsLoading(true);
      setReviewsMessage("Criando avaliação de teste...");

      const response = await fetch("/api/reviews/test", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Erro ao criar avaliação de teste."
        );
      }

      await loadReviews();
      setReviewsMessage("Avaliação de teste criada com sucesso!");
    } catch (error) {
      setReviewsMessage(
        error instanceof Error
          ? error.message
          : "Erro ao criar avaliação de teste."
      );
    } finally {
      setReviewsLoading(false);
    }
  }

  async function generateReviewResponses() {
    try {
      setReviewsLoading(true);
      setReviewsMessage("Preparando respostas...");

      const response = await fetch(
        "/api/reviews/generate",
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Erro ao preparar respostas."
        );
      }

      await loadReviews();

      setReviewsMessage(
        `${result.generated || 0} resposta(s) preparada(s).`
      );
    } catch (error) {
      setReviewsMessage(
        error instanceof Error
          ? error.message
          : "Erro ao preparar respostas."
      );
      setReviewsLoading(false);
    }
  }

  async function saveReviewResponse(
    reviewId: string,
    responseText: string
  ) {
    try {
      const response = await fetch(
        "/api/reviews/edit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewId,
            response: responseText,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Erro ao salvar resposta."
        );
      }

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                edited_response: responseText,
              }
            : review
        )
      );

      setEditingReview(null);
    } catch (error) {
      setReviewsMessage(
        error instanceof Error
          ? error.message
          : "Erro ao salvar resposta."
      );
    }
  }

  async function deleteTestReview(reviewId: string) {
    try {
      setReviewsLoading(true);
      setReviewsMessage("Excluindo avaliação de teste...");

      const response = await fetch("/api/reviews/test/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao excluir avaliação de teste.");
      }

      setReviews((current) =>
        current.filter((review) => review.id !== reviewId)
      );
      setReviewsMessage("Avaliação de teste excluída com sucesso!");
    } catch (error) {
      setReviewsMessage(
        error instanceof Error
          ? error.message
          : "Erro ao excluir avaliação de teste."
      );
    } finally {
      setReviewsLoading(false);
    }
  }

  async function sendReview(reviewId: string) {
    try {
      setSendingReview(reviewId);
      setReviewsMessage("");

      const response = await fetch(
        "/api/reviews/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Erro ao enviar resposta."
        );
      }

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                response_status: "SENT",
              }
            : review
        )
      );

      setReviewsMessage(
        "Resposta enviada para a Shopee com sucesso!"
      );
    } catch (error) {
      setReviewsMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar resposta."
      );
    } finally {
      setSendingReview(null);
    }
  }

  async function saveMinimumStock(
    variationId: string,
    minStock: number
  ) {
    try {
      setSavingMinimum(variationId);
      setStockMessage("");

      const response = await fetch("/api/stock/minimum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variationId,
          minStock,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Erro ao atualizar estoque mínimo."
        );
      }

      await loadDashboard(period);

      setStockMessage(
        "Estoque mínimo atualizado com sucesso!"
      );
    } catch (error) {
      setStockMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar estoque mínimo."
      );
    } finally {
      setSavingMinimum(null);
    }
  }

  async function saveStockSettings(
    leadTimeDays: number,
    safetyDays: number
  ) {
    try {
      setSavingStockSettings(true);
      setStockMessage("");

      const response = await fetch("/api/stock/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadTimeDays, safetyDays }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Erro ao atualizar configurações de reposição."
        );
      }

      await loadDashboard(period);
      setStockMessage("Configurações de reposição atualizadas com sucesso!");
    } catch (error) {
      setStockMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar configurações de reposição."
      );
    } finally {
      setSavingStockSettings(false);
    }
  }

  function money(value: number) {
    return new Intl.NumberFormat(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    ).format(value || 0);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090c] text-white flex items-center justify-center">
        <div className="text-zinc-400">
          Carregando dashboard...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#08090c] text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
            <p className="text-red-400">
              {error}
            </p>

            <button
              onClick={() =>
                loadDashboard()
              }
              className="mt-4 px-4 py-2 rounded-lg bg-white text-black font-medium"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const metrics = data.metrics;

  const stockVariations = [...data.variations].sort((a, b) => {
    const priorityA = Number(a.purchase_priority_score ?? 0);
    const priorityB = Number(b.purchase_priority_score ?? 0);

    if (priorityA !== priorityB) return priorityB - priorityA;

    const riskA = Boolean(a.risk_before_arrival) ? 1 : 0;
    const riskB = Boolean(b.risk_before_arrival) ? 1 : 0;

    if (riskA !== riskB) return riskB - riskA;

    const purchaseA = Number(a.suggested_purchase ?? 0);
    const purchaseB = Number(b.suggested_purchase ?? 0);

    if (purchaseA !== purchaseB) return purchaseB - purchaseA;

    const coverageA =
      a.days_of_stock === null || a.days_of_stock === undefined
        ? Number.POSITIVE_INFINITY
        : Number(a.days_of_stock);
    const coverageB =
      b.days_of_stock === null || b.days_of_stock === undefined
        ? Number.POSITIVE_INFINITY
        : Number(b.days_of_stock);

    return coverageA - coverageB;
  });

  const purchaseItems = stockVariations.filter((variation) =>
    Number(variation.suggested_purchase ?? 0) > 0
  );

  const totalSuggestedPurchase = purchaseItems.reduce(
    (total, variation) =>
      total + Number(variation.suggested_purchase ?? 0),
    0
  );

  const riskItems = stockVariations.filter((variation) =>
    Boolean(variation.risk_before_arrival)
  ).length;

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <div className="w-full px-6 lg:px-8 py-8">

        {/* HEADER */}

        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

          <div>
            <p className="text-sm text-zinc-500 mb-1">
              Shopee Stock AI
            </p>

            <h1 className="text-3xl font-bold">
              Dashboard
            </h1>

            <p className="text-zinc-500 mt-1">
              Visão geral da sua operação
            </p>
          </div>

          <button
            onClick={() =>
              loadDashboard()
            }
            className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition"
          >
            Atualizar
          </button>

        </header>

        {/* NAVEGAÇÃO */}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() =>
              setActiveTab("dashboard")
            }
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "dashboard"
                ? "bg-white text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              setActiveTab("sales")
            }
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "sales"
                ? "bg-white text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            Vendas
          </button>

          <button
            onClick={() =>
              setActiveTab("purchases")
            }
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "purchases"
                ? "bg-white text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            Compras / Reposição
          </button>

          <button
            onClick={() => {
              setActiveTab("reviews");
              loadReviews();
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "reviews"
                ? "bg-white text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            Avaliações
          </button>
        </div>

        {activeTab === "reviews" ? (
          <ReviewsSection
            reviews={reviews}
            loading={reviewsLoading}
            message={reviewsMessage}
            editingReview={editingReview}
            sendingReview={sendingReview}
            setEditingReview={setEditingReview}
            onSync={syncReviews}
            onGenerate={generateReviewResponses}
            onSave={saveReviewResponse}
            onSend={sendReview}
            onCreateTest={createTestReview}
            onDeleteTest={deleteTestReview}
          />
        ) : activeTab === "sales" ? (
          <SalesSection
            data={data}
            money={money}
            period={period}
            setPeriod={setPeriod}
          />
        ) : activeTab === "purchases" ? (
          <PurchasesSection
            data={data}
            purchaseItems={purchaseItems}
            money={money}
          />
          ) : (
            <>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          <MetricCard
            title="Produtos"
            value={metrics.products.toString()}
            subtitle="Produtos cadastrados"
          />

          <MetricCard
            title="Estoque"
            value={metrics.totalStock.toString()}
            subtitle="Unidades disponíveis"
          />

          <MetricCard
            title="Valor do estoque"
            value={money(
              metrics.inventoryValue
            )}
            subtitle="Custo dos produtos"
          />

          <MetricCard
            title="Lucro potencial"
            value={money(
              metrics.potentialProfit
            )}
            subtitle="Se todo estoque vender"
          />

        </section>

        {/* PERFORMANCE */}

        <section className="bg-[#101116] border border-white/5 rounded-2xl p-6 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

            <div>
              <h2 className="text-xl font-semibold">
                Performance
              </h2>

              <p className="text-sm text-zinc-500 mt-1">
                Desempenho das vendas no período
              </p>
            </div>

            <div className="flex gap-2">

              {[1, 7, 30, 90].map(
                (value) => (
                  <button
                    key={value}
                    onClick={() =>
                      setPeriod(value)
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      period === value
                        ? "bg-white text-black"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {value === 1
                      ? "Hoje"
                      : `${value} dias`}
                  </button>
                )
              )}

            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            <PerformanceCard
              title="Faturamento"
              value={money(
                metrics.revenue
              )}
            />

            <PerformanceCard
              title="Pedidos"
              value={metrics.orders.toString()}
            />

            <PerformanceCard
              title="Unidades vendidas"
              value={metrics.unitsSold.toString()}
            />

            <PerformanceCard
              title="Lucro"
              value={money(
                metrics.grossProfit
              )}
            />

            <PerformanceCard
              title="Margem"
              value={`${metrics.margin.toFixed(
                1
              )}%`}
            />

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

            <div className="bg-white/[0.03] rounded-xl p-4">
              <p className="text-xs text-zinc-500">
                Ticket médio
              </p>

              <p className="text-xl font-bold mt-1">
                {money(
                  metrics.averageOrderValue
                )}
              </p>
            </div>

            <div className="bg-white/[0.03] rounded-xl p-4">
              <p className="text-xs text-zinc-500">
                Custo dos produtos
              </p>

              <p className="text-xl font-bold mt-1">
                {money(
                  metrics.productCost
                )}
              </p>
            </div>

          </div>

        </section>

        {/* CENTRAL DE ALERTAS */}

        <AlertsCenter
          data={data}
        />

        {/* PAINEL EXECUTIVO */}

        <ExecutiveInsights
          data={data}
          money={money}
        />

        {/* SAÚDE DO ESTOQUE */}

        <StockHealthSection
          data={data}
          money={money}
        />

        {/* CONFIGURAÇÃO DE REPOSIÇÃO */}

        <StockSettingsCard
          leadTimeDays={Number(data.stockSettings?.leadTimeDays ?? 14)}
          safetyDays={Number(data.stockSettings?.safetyDays ?? 7)}
          saving={savingStockSettings}
          onSave={saveStockSettings}
        />

        {/* ESTOQUE + ALERTAS */}

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)] gap-6">

          <div className="min-w-0 bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">

            <div className="p-5 border-b border-white/5">

              <h2 className="font-semibold text-lg">
                Estoque
              </h2>

              <p className="text-sm text-zinc-500">
                Previsão de compra baseada nos últimos {Number(data.stockSettings?.forecastDays ?? 30)} dias
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex px-3 py-1.5 rounded-lg bg-white/5 text-xs text-zinc-300">
                  {purchaseItems.length} item(ns) para comprar
                </span>

                <span className="inline-flex px-3 py-1.5 rounded-lg bg-red-500/10 text-xs font-semibold text-red-400">
                  {totalSuggestedPurchase} un. sugeridas
                </span>

                {riskItems > 0 && (
                  <span className="inline-flex px-3 py-1.5 rounded-lg bg-orange-500/10 text-xs font-semibold text-orange-400">
                    {riskItems} com risco antes da chegada
                  </span>
                )}
              </div>

              {stockMessage && (
                <p className="text-sm text-zinc-300 mt-3">
                  {stockMessage}
                </p>
              )}

            </div>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="text-left text-xs uppercase text-zinc-500 border-b border-white/5">

                    <th className="px-5 py-4">
                      Produto
                    </th>

                    <th className="px-5 py-4">
                      SKU
                    </th>

                    <th className="px-5 py-4">
                      Preço
                    </th>

                    <th className="px-5 py-4">
                      Custo
                    </th>

                    <th className="px-5 py-4">
                      Estoque
                    </th>

                    <th className="px-5 py-4">
                      Mínimo
                    </th>

                    <th className="px-5 py-4">
                      Cobertura
                    </th>

                    <th className="px-5 py-4">
                      Comprar
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {stockVariations.length ? (

                    stockVariations.map(
                      (variation) => {

                        const product =
                          data.products.find(
                            (p) =>
                              p.id ===
                              variation.product_id
                          );

                        const stock =
                          Number(
                            variation.stock || 0
                          );

                        const averageDailySales =
                          Number(
                            variation.average_daily_sales || 0
                          );

                        const coverageDays =
                          variation.days_of_stock === null ||
                          variation.days_of_stock === undefined
                            ? null
                            : Number(variation.days_of_stock);

                        const suggestedPurchase =
                          Number(
                            variation.suggested_purchase ??
                              Math.max(
                                Number(variation.min_stock ?? 5) -
                                  stock,
                                0
                              )
                          );

                        return (
                          <tr
                            key={variation.id}
                            className="border-b border-white/5 hover:bg-white/[0.02]"
                          >

                            <td className="px-5 py-4">

                              <div className="font-medium">
                                {product?.name ||
                                  "Produto"}
                              </div>

                              <div className="text-xs text-zinc-500 mt-1">
                                {variation.name}
                              </div>

                            </td>

                            <td className="px-5 py-4 text-sm text-zinc-400">
                              {variation.sku ||
                                product?.sku ||
                                "-"}
                            </td>

                            <td className="px-5 py-4 text-sm">
                              {money(
                                Number(
                                  variation.price ||
                                    0
                                )
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm text-zinc-400">
                              {money(
                                Number(
                                  variation.cost ||
                                    0
                                )
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  stock <= Number(variation.min_stock ?? 5)
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-green-500/10 text-green-400"
                                }`}
                              >
                                {stock} un.
                              </span>

                            </td>

                            <td className="px-5 py-4">
                              <MinimumStockEditor
                                value={Number(
                                  variation.min_stock ?? 5
                                )}
                                saving={
                                  savingMinimum === variation.id
                                }
                                onSave={(value) =>
                                  saveMinimumStock(
                                    variation.id,
                                    value
                                  )
                                }
                              />
                            </td>

                            <td className="px-5 py-4 text-sm">
                              {averageDailySales > 0 &&
                              coverageDays !== null ? (
                                <span
                                  className={
                                    Boolean(
                                      variation.risk_before_arrival
                                    )
                                      ? "text-red-400 font-semibold"
                                      : "text-zinc-300"
                                  }
                                >
                                  {coverageDays.toFixed(1)} dias
                                  {Boolean(variation.risk_before_arrival) && (
                                    <span className="block text-[10px] uppercase tracking-wide text-red-400 mt-1">
                                      Risco antes da chegada
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-zinc-500">
                                  Sem histórico
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {suggestedPurchase > 0 ? (
                                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400">
                                  {suggestedPurchase} un.
                                </span>
                              ) : (
                                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400">
                                  0 un.
                                </span>
                              )}
                            </td>

                          </tr>
                        );
                      }
                    )

                  ) : (

                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-zinc-500"
                      >
                        Nenhum produto cadastrado.
                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* ALERTAS */}

          <div className="bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">

            <div className="p-5 border-b border-white/5">

              <h2 className="font-semibold text-lg">
                Alertas
              </h2>

              <p className="text-sm text-zinc-500 mt-1">
                O que precisa da sua atenção
              </p>

            </div>

            <div className="p-5">

              {data.lowStock.length ? (

                <div className="space-y-3">

                  {data.lowStock.map(
                    (variation) => {

                      const product =
                        data.products.find(
                          (p) =>
                            p.id ===
                            variation.product_id
                        );

                      const currentStock = Number(variation.stock || 0);
                      const minimumStock = Number(variation.min_stock ?? 5);
                      const leadTimeDays = Number(
                        variation.lead_time_days ??
                          data.stockSettings?.leadTimeDays ??
                          14
                      );
                      const safetyDays = Number(
                        variation.safety_days ??
                          data.stockSettings?.safetyDays ??
                          7
                      );
                      const averageDailySales = Number(
                        variation.average_daily_sales || 0
                      );
                      const coverageDays =
                        variation.days_of_stock === null ||
                        variation.days_of_stock === undefined
                          ? null
                          : Number(variation.days_of_stock);
                      const recommendedStock = Number(
                        variation.recommended_stock ?? minimumStock
                      );
                      const restockSuggestion = Number(
                        variation.suggested_purchase ??
                          Math.max(recommendedStock - currentStock, 0)
                      );
                      const mayRunOutBeforeArrival =
                        Boolean(variation.risk_before_arrival);

                      return (
                        <div
                          key={variation.id}
                          className="p-4 rounded-xl bg-red-500/5 border border-red-500/10"
                        >
                          <div className="font-medium text-sm">
                            {product?.name || "Produto"}
                          </div>

                          <div className="text-xs text-zinc-500 mt-1">
                            {variation.name}
                          </div>

                          <div className="mt-3 space-y-1">
                            <div className="text-xs text-red-400 font-semibold">
                              Estoque atual: {currentStock} un.
                            </div>

                            <div className="text-xs text-zinc-400">
                              Mínimo manual: {minimumStock} un.
                            </div>
                          </div>

                          <div className="my-3 border-t border-white/5" />

                          {averageDailySales > 0 ? (
                            <>
                              <div className="text-xs text-zinc-300">
                                Venda média: {averageDailySales.toFixed(2)} un./dia
                              </div>

                              <div className="text-xs text-zinc-400 mt-1">
                                Cobertura: {coverageDays?.toFixed(1)} dias
                              </div>

                              {mayRunOutBeforeArrival && (
                                <div className="text-xs text-red-400 font-semibold mt-2">
                                  ⚠ Pode acabar antes da reposição chegar
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-zinc-400">
                                Venda média: sem histórico
                              </div>

                              <div className="text-xs text-zinc-500 mt-1">
                                Cobertura: sem histórico
                              </div>
                            </>
                          )}

                          <div className="my-3 border-t border-white/5" />

                          <div className="text-xs text-zinc-400">
                            Prazo de reposição: {leadTimeDays} dias
                          </div>

                          <div className="text-xs text-zinc-400 mt-1">
                            Margem de segurança: {safetyDays} dias
                          </div>

                          {averageDailySales > 0 && (
                            <div className="text-xs text-zinc-300 mt-1">
                              Estoque recomendado: {recommendedStock} un.
                            </div>
                          )}

                          <div className="text-xs text-red-400 mt-2 font-semibold">
                            Sugestão de compra: {restockSuggestion} un.
                          </div>
                        </div>
                      );
                    }
                  )}

                </div>

              ) : (

                <div className="py-10 text-center">

                  <div className="text-3xl mb-3">
                    ✓
                  </div>

                  <p className="font-medium">
                    Tudo tranquilo 👍
                  </p>

                  <p className="text-sm text-zinc-500 mt-1">
                    Nenhuma variação está com estoque baixo.
                  </p>

                </div>

              )}

            </div>

          </div>

        </section>

            </>
          )}
      </div>
    </main>
  );
}


function AlertsCenter({
  data,
}: {
  data: DashboardData;
}) {
  const alerts = data.alerts || {
    total: 0,
    critical: 0,
    attention: 0,
    info: 0,
    items: [],
  };

  function alertStyle(level: string) {
    if (level === "CRITICO") {
      return {
        badge: "bg-red-500/10 text-red-400",
        border: "border-red-500/10",
        label: "Crítico",
      };
    }

    if (level === "ATENCAO") {
      return {
        badge: "bg-orange-500/10 text-orange-400",
        border: "border-orange-500/10",
        label: "Atenção",
      };
    }

    return {
      badge: "bg-white/5 text-zinc-300",
      border: "border-white/5",
      label: "Informação",
    };
  }

  return (
    <section className="bg-[#101116] border border-white/5 rounded-2xl p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Central de alertas</h2>
            <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-semibold">
              {alerts.total}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Avisos operacionais gerados pelos dados de estoque e reposição.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400">
            {alerts.critical} crítico(s)
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400">
            {alerts.attention} atenção
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-400">
            {alerts.info} informação
          </span>
        </div>
      </div>

      {alerts.items.length > 0 ? (
        <div className="space-y-3 mt-6">
          {alerts.items.slice(0, 12).map((alert: any) => {
            const variation = data.variations.find(
              (item) => item.id === alert.variation_id
            );
            const product = data.products.find(
              (item) => item.id === alert.product_id
            );
            const style = alertStyle(alert.level);

            return (
              <div
                key={alert.id}
                className={`rounded-xl border ${style.border} bg-white/[0.02] p-4`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${style.badge}`}
                      >
                        {style.label}
                      </span>
                      <span className="font-semibold text-sm">
                        {alert.title}
                      </span>
                    </div>

                    <div className="text-sm text-zinc-300 mt-3">
                      {product?.name || "Produto"}
                      {variation?.name ? ` · ${variation.name}` : ""}
                    </div>

                    <div className="text-xs text-zinc-500 mt-1">
                      SKU: {variation?.sku || product?.sku || "-"}
                    </div>

                    <div className="text-xs text-zinc-400 mt-2">
                      {alert.message}
                    </div>
                  </div>

                  <div className="md:text-right shrink-0">
                    <div className="text-xs text-zinc-500">Ação sugerida</div>
                    <div className="text-sm font-semibold mt-1">
                      {alert.action}
                    </div>
                    {alert.order_by_date && (
                      <div className="text-xs text-zinc-500 mt-2">
                        Pedir até {formatStockDate(alert.order_by_date)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 py-10 rounded-xl bg-white/[0.02] text-center">
          <div className="font-medium">Nenhum alerta ativo</div>
          <div className="text-sm text-zinc-500 mt-1">
            Não há nenhuma ação crítica identificada com os dados disponíveis.
          </div>
        </div>
      )}

      {alerts.items.length > 12 && (
        <div className="text-xs text-zinc-500 mt-4">
          Mostrando os 12 alertas mais importantes de {alerts.total}.
        </div>
      )}
    </section>
  );
}


function ExecutiveInsights({
  data,
  money,
}: {
  data: DashboardData;
  money: (value: number) => string;
}) {
  const insights = data.executiveInsights || {
    revenue: Number(data.metrics?.revenue || 0),
    grossProfit: Number(data.metrics?.grossProfit || 0),
    orders: Number(data.metrics?.orders || 0),
    units: Number(data.metrics?.unitsSold || 0),
    riskSkus: 0,
    urgentSkus: 0,
    criticalClassA: 0,
    purchaseInvestment: 0,
    excessCapital: 0,
    nextOrderDates: [],
  };

  const actions = [
    insights.riskSkus > 0
      ? `${insights.riskSkus} SKU(s) com risco de ruptura`
      : null,
    insights.criticalClassA > 0
      ? `${insights.criticalClassA} produto(s) classe A exigem atenção`
      : null,
    insights.purchaseInvestment > 0
      ? `${money(insights.purchaseInvestment)} sugeridos para reposição`
      : null,
    insights.excessCapital > 0
      ? `${money(insights.excessCapital)} estimados em possível excesso`
      : null,
  ].filter(Boolean);

  return (
    <section className="bg-[#101116] border border-white/5 rounded-2xl p-6 mb-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Painel executivo</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Resumo do período e das decisões de estoque que exigem atenção.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-zinc-400">
          Estoque previsto com janela fixa de 30 dias
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <PurchaseMetric title="Faturamento" value={money(insights.revenue)} />
        <PurchaseMetric title="Lucro bruto" value={money(insights.grossProfit)} />
        <PurchaseMetric title="Pedidos" value={String(insights.orders)} />
        <PurchaseMetric title="Unidades" value={String(insights.units)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <div className="rounded-xl bg-red-500/[0.06] border border-red-500/10 p-4">
          <div className="text-xs text-red-300/70">SKUs em risco</div>
          <div className="text-2xl font-bold mt-1">{insights.riskSkus}</div>
          <div className="text-xs text-zinc-500 mt-2">
            Podem acabar antes da reposição chegar.
          </div>
        </div>

        <div className="rounded-xl bg-orange-500/[0.06] border border-orange-500/10 p-4">
          <div className="text-xs text-orange-300/70">Classe A crítica</div>
          <div className="text-2xl font-bold mt-1">{insights.criticalClassA}</div>
          <div className="text-xs text-zinc-500 mt-2">
            Itens de maior relevância com compra urgente ou alta.
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <div className="text-xs text-zinc-500">Caixa para reposição</div>
          <div className="text-2xl font-bold mt-1">
            {money(insights.purchaseInvestment)}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Baseado nos custos cadastrados.
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <div className="text-xs text-zinc-500">Possível capital parado</div>
          <div className="text-2xl font-bold mt-1">
            {money(insights.excessCapital)}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Estimativa apenas para itens com histórico.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
          <h3 className="font-semibold">O que exige atenção</h3>

          {actions.length ? (
            <div className="space-y-2 mt-4">
              {actions.map((action, index) => (
                <div
                  key={`${action}-${index}`}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-3 text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-white/60 shrink-0" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500 mt-4">
              Nenhuma ação crítica identificada com os dados disponíveis.
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
          <h3 className="font-semibold">Próximos pedidos</h3>

          {insights.nextOrderDates?.length ? (
            <div className="space-y-2 mt-4">
              {insights.nextOrderDates.map((item: any) => {
                const variation = data.variations.find(
                  (variationItem) => variationItem.id === item.variation_id
                );
                const product = data.products.find(
                  (productItem) => productItem.id === item.product_id
                );

                return (
                  <div
                    key={`executive-order-${item.variation_id}`}
                    className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.03] px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {product?.name || "Produto"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {variation?.name || "Variação"} · comprar{" "}
                        {Number(item.suggested_purchase || 0)} un.
                        {item.abc_class ? ` · ABC ${item.abc_class}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-zinc-500">Pedir até</div>
                      <div className="text-sm font-semibold mt-1">
                        {formatStockDate(item.order_by_date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-zinc-500 mt-4">
              Nenhum pedido previsto no momento.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


function StockHealthSection({
  data,
  money,
}: {
  data: DashboardData;
  money: (value: number) => string;
}) {
  const health = data.stockHealth || {
    risk: 0,
    buyNow: 0,
    healthy: 0,
    slowMoving: 0,
    excess: 0,
    noHistory: 0,
    excessUnits: 0,
    excessCapital: 0,
  };

  const attentionItems = [...data.variations]
    .filter((item) =>
      ["RISCO_RUPTURA", "COMPRAR_AGORA", "EXCESSO", "BAIXO_GIRO"].includes(
        item.stock_health
      )
    )
    .sort(
      (a, b) =>
        Number(b.purchase_priority_score || 0) -
        Number(a.purchase_priority_score || 0)
    )
    .slice(0, 8);

  function healthLabel(value: string) {
    if (value === "RISCO_RUPTURA") return "Risco de ruptura";
    if (value === "COMPRAR_AGORA") return "Comprar agora";
    if (value === "EXCESSO") return "Possível excesso";
    if (value === "BAIXO_GIRO") return "Baixo giro";
    if (value === "SEM_HISTORICO") return "Sem histórico";
    return "Saudável";
  }

  function healthClass(value: string) {
    if (value === "RISCO_RUPTURA") return "bg-red-500/10 text-red-400";
    if (value === "COMPRAR_AGORA") return "bg-orange-500/10 text-orange-400";
    if (value === "EXCESSO") return "bg-yellow-500/10 text-yellow-300";
    if (value === "BAIXO_GIRO") return "bg-white/5 text-zinc-300";
    return "bg-green-500/10 text-green-400";
  }

  return (
    <section className="bg-[#101116] border border-white/5 rounded-2xl p-6 mb-6">
      <div>
        <h2 className="text-xl font-semibold">Saúde do estoque</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Diagnóstico usando giro, cobertura, prazo de reposição e necessidade de compra.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-6">
        <PurchaseMetric title="Risco" value={String(health.risk)} />
        <PurchaseMetric title="Comprar agora" value={String(health.buyNow)} />
        <PurchaseMetric title="Saudável" value={String(health.healthy)} />
        <PurchaseMetric title="Baixo giro" value={String(health.slowMoving)} />
        <PurchaseMetric title="Excesso" value={String(health.excess)} />
        <PurchaseMetric title="Sem histórico" value={String(health.noHistory)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500">Unidades em possível excesso</div>
          <div className="text-xl font-bold mt-1">{health.excessUnits} un.</div>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500">Capital estimado no excesso</div>
          <div className="text-xl font-bold mt-1">
            {money(Number(health.excessCapital || 0))}
          </div>
        </div>
      </div>

      {attentionItems.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold">Itens para observar</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
            {attentionItems.map((variation) => {
              const product = data.products.find(
                (item) => item.id === variation.product_id
              );

              return (
                <div
                  key={`health-${variation.id}`}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {product?.name || "Produto"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {variation.name} · {variation.sku || product?.sku || "-"}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${healthClass(
                        variation.stock_health
                      )}`}
                    >
                      {healthLabel(variation.stock_health)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                    <div>
                      <div className="text-zinc-500">Estoque</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.stock || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Cobertura</div>
                      <div className="font-semibold mt-1">
                        {variation.days_of_stock == null
                          ? "Sem histórico"
                          : `${Number(variation.days_of_stock).toFixed(1)} dias`}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Comprar</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.suggested_purchase || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Excesso</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.excess_units || 0)} un.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-600 mt-5">
        Possível excesso é uma estimativa baseada em mais de duas vezes a cobertura-alvo.
        Produtos sem histórico de vendas não são classificados como excesso.
      </p>
    </section>
  );
}


function SalesSection({
  data,
  money,
  period,
  setPeriod,
}: {
  data: DashboardData;
  money: (value: number) => string;
  period: number;
  setPeriod: (value: number) => void;
}) {
  const sales = data.sales || {
    daily: [],
    topProducts: [],
    topProfitProducts: [],
    productAnalysis: [],
    recentOrders: [],
  };

  const productAnalysis = sales.productAnalysis || [];
  const topProfitProducts = sales.topProfitProducts || [];
  const bestSeller = sales.topProducts?.[0] || null;
  const mostProfitable = topProfitProducts[0] || null;

  const abcCounts = productAnalysis.reduce(
    (acc: Record<string, number>, item: any) => {
      const key = item.abc_class || "C";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { A: 0, B: 0, C: 0 }
  );

  const maxDailyRevenue = Math.max(
    ...sales.daily.map((day: any) => Number(day.revenue || 0)),
    1
  );

  return (
    <section className="space-y-6">
      <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-xl font-semibold">Vendas</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Pedidos e desempenho comercial no período selecionado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 7, 30, 90].map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  period === value
                    ? "bg-white text-black"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                {value === 1 ? "Hoje" : `${value} dias`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
          <PurchaseMetric title="Faturamento" value={money(data.metrics.revenue)} />
          <PurchaseMetric title="Pedidos" value={data.metrics.orders.toString()} />
          <PurchaseMetric title="Unidades vendidas" value={data.metrics.unitsSold.toString()} />
          <PurchaseMetric title="Lucro bruto" value={money(data.metrics.grossProfit)} />
          <PurchaseMetric title="Ticket médio" value={money(data.metrics.averageOrderValue)} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] gap-6">
        <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
          <h3 className="font-semibold text-lg">Vendas por dia</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Faturamento diário dentro do período selecionado.
          </p>

          {sales.daily.length ? (
            <div className="mt-6 space-y-3">
              {sales.daily.map((day: any) => {
                const width = Math.max(
                  2,
                  (Number(day.revenue || 0) / maxDailyRevenue) * 100
                );

                return (
                  <div key={day.date} className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      {formatStockDate(day.date)}
                    </span>
                    <div className="h-8 rounded-lg bg-white/[0.03] overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-white/10"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{money(Number(day.revenue || 0))}</div>
                      <div className="text-[10px] text-zinc-500">
                        {Number(day.orders || 0)} pedido(s)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-zinc-500">
              Nenhuma venda encontrada neste período.
            </div>
          )}
        </div>

        <div className="bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="font-semibold text-lg">Mais vendidos</h3>
            <p className="text-sm text-zinc-500 mt-1">Ranking por unidades vendidas.</p>
          </div>

          <div className="p-5">
            {sales.topProducts.length ? (
              <div className="space-y-3">
                {sales.topProducts.map((item: any, index: number) => (
                  <div
                    key={`${item.product_id}-${item.variation_id || "product"}-${index}`}
                    className="rounded-xl bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-zinc-500">#{index + 1}</div>
                        <div className="font-medium text-sm mt-1">{item.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">{item.sku || "-"}</div>
                      </div>
                      <span className="text-sm font-bold">{Number(item.units || 0)} un.</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-3">
                      Faturamento: {money(Number(item.revenue || 0))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-zinc-500">
                Sem produtos vendidos no período.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
          <h3 className="font-semibold text-lg">Destaques dos produtos</h3>
          <p className="text-sm text-zinc-500 mt-1">Comparação por giro e lucro no período selecionado.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="rounded-xl bg-white/[0.03] p-4">
              <div className="text-xs text-zinc-500">Mais vendido</div>
              <div className="font-semibold mt-2">{bestSeller?.name || "Sem vendas"}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {bestSeller ? `${Number(bestSeller.units || 0)} un. · ${money(Number(bestSeller.revenue || 0))}` : "Nenhum dado no período"}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4">
              <div className="text-xs text-zinc-500">Maior lucro bruto</div>
              <div className="font-semibold mt-2">{mostProfitable?.name || "Sem vendas"}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {mostProfitable ? `${money(Number(mostProfitable.profit || 0))} · ${Number(mostProfitable.margin || 0).toFixed(1)}% margem` : "Nenhum dado no período"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
          <h3 className="font-semibold text-lg">Curva ABC</h3>
          <p className="text-sm text-zinc-500 mt-1">Classificação pela participação acumulada no faturamento.</p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {(["A", "B", "C"] as const).map((abc) => (
              <div key={abc} className="rounded-xl bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold">{abcCounts[abc] || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">Classe {abc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-4">A: até 80% · B: até 95% · C: restante do faturamento acumulado.</p>
        </div>
      </div>

      <div className="bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-semibold text-lg">Análise por produto</h3>
          <p className="text-sm text-zinc-500 mt-1">Faturamento, custo, lucro, margem, participação e curva ABC.</p>
        </div>
        {productAnalysis.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-zinc-500 border-b border-white/5">
                  <th className="px-5 py-4">Produto</th>
                  <th className="px-5 py-4">Unidades</th>
                  <th className="px-5 py-4">Faturamento</th>
                  <th className="px-5 py-4">Custo</th>
                  <th className="px-5 py-4">Lucro</th>
                  <th className="px-5 py-4">Margem</th>
                  <th className="px-5 py-4">Participação</th>
                  <th className="px-5 py-4">ABC</th>
                </tr>
              </thead>
              <tbody>
                {productAnalysis.map((item: any, index: number) => (
                  <tr key={`${item.product_id}-${item.variation_id || "product"}-${index}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">{item.variation_name || item.sku || "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">{Number(item.units || 0)}</td>
                    <td className="px-5 py-4 text-sm">{money(Number(item.revenue || 0))}</td>
                    <td className="px-5 py-4 text-sm text-zinc-400">{money(Number(item.cost || 0))}</td>
                    <td className="px-5 py-4 text-sm font-semibold">{money(Number(item.profit || 0))}</td>
                    <td className="px-5 py-4 text-sm">{Number(item.margin || 0).toFixed(1)}%</td>
                    <td className="px-5 py-4 text-sm">{Number(item.revenue_share || 0).toFixed(1)}%</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex min-w-8 justify-center px-2.5 py-1 rounded-lg bg-white/5 text-xs font-bold">{item.abc_class || "C"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-6 text-center text-sm text-zinc-500">Nenhum produto vendido neste período.</div>
        )}
      </div>

      <div className="bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-semibold text-lg">Pedidos recentes</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Últimos pedidos válidos sincronizados da Shopee.
          </p>
        </div>

        {sales.recentOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-zinc-500 border-b border-white/5">
                  <th className="px-5 py-4">Pedido</th>
                  <th className="px-5 py-4">Data</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Itens</th>
                  <th className="px-5 py-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-sm font-medium">
                      {order.order_sn || order.shopee_order_sn || order.id}
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-400 whitespace-nowrap">
                      {formatSalesDate(order.order_date)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-white/5 text-xs text-zinc-300">
                        {order.status || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {Number(order.units || 0)} un.
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">
                      {money(Number(order.total_amount || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-6 text-center text-sm text-zinc-500">
            Nenhum pedido encontrado neste período.
          </div>
        )}
      </div>
    </section>
  );
}

function formatSalesDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function PurchasesSection({
  data,
  purchaseItems,
  money,
}: {
  data: DashboardData;
  purchaseItems: any[];
  money: (value: number) => string;
}) {
  const [purchaseOrderFilter, setPurchaseOrderFilter] = useState<
    "ALL" | "URGENT" | "A"
  >("ALL");
  const [purchaseOrderCopied, setPurchaseOrderCopied] = useState(false);

  const totalUnits = purchaseItems.reduce(
    (total, variation) =>
      total + Number(variation.suggested_purchase ?? 0),
    0
  );

  const totalEstimatedCost = purchaseItems.reduce(
    (total, variation) =>
      total +
      Number(variation.suggested_purchase ?? 0) *
        Number(variation.cost ?? 0),
    0
  );

  const riskCount = purchaseItems.filter((variation) =>
    Boolean(variation.risk_before_arrival)
  ).length;

  const prioritizedItems = [...purchaseItems].sort(
    (a, b) =>
      Number(b.purchase_priority_score || 0) -
      Number(a.purchase_priority_score || 0)
  );

  const urgentItems = prioritizedItems.filter(
    (item) => item.purchase_priority === "URGENTE"
  );

  const classAItems = prioritizedItems.filter(
    (item) => item.abc_class === "A"
  );

  const purchaseCash = data.purchaseCash || {
    total: 0,
    urgent: 0,
    classA: 0,
    normal: 0,
    missingCostItems: 0,
    itemCount: 0,
    totalUnits: 0,
  };


  const purchaseOrderItems = prioritizedItems.filter((item) => {
    if (Number(item.suggested_purchase || 0) <= 0) return false;
    if (purchaseOrderFilter === "URGENT") {
      return item.purchase_priority === "URGENTE";
    }
    if (purchaseOrderFilter === "A") {
      return item.abc_class === "A";
    }
    return true;
  });

  const purchaseOrderUnits = purchaseOrderItems.reduce(
    (total, item) => total + Number(item.suggested_purchase || 0),
    0
  );

  const purchaseOrderValue = purchaseOrderItems.reduce(
    (total, item) => total + Number(item.purchase_investment || 0),
    0
  );

  const purchaseOrderMissingCost = purchaseOrderItems.filter(
    (item) => !item.has_purchase_cost
  ).length;

  async function copyPurchaseOrder() {
    const lines = purchaseOrderItems.map((variation, index) => {
      const product = data.products.find(
        (item) => item.id === variation.product_id
      );
      const unitCost = Number(variation.purchase_unit_cost || 0);
      const investment = Number(variation.purchase_investment || 0);
      const costText = variation.has_purchase_cost
        ? `${money(unitCost)} | Subtotal: ${money(investment)}`
        : "Custo não informado";

      return `${index + 1}. ${product?.name || "Produto"} - ${variation.name}
SKU: ${variation.sku || product?.sku || "-"}
Quantidade: ${Number(variation.suggested_purchase || 0)} un.
${costText}
Prioridade: ${
        variation.purchase_priority === "URGENTE"
          ? "Urgente"
          : variation.purchase_priority === "ALTA"
            ? "Alta"
            : "Normal"
      }${variation.abc_class ? ` | ABC: ${variation.abc_class}` : ""}
Pedir até: ${variation.order_by_date || "Sem previsão"}`;
    });

    const text = `PEDIDO DE COMPRA

Itens: ${purchaseOrderItems.length}
Unidades: ${purchaseOrderUnits}
Valor estimado: ${money(purchaseOrderValue)}
Itens sem custo: ${purchaseOrderMissingCost}

${lines.join("\\n\\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setPurchaseOrderCopied(true);
      window.setTimeout(() => setPurchaseOrderCopied(false), 2000);
    } catch {
      setPurchaseOrderCopied(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Planejamento de caixa</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Quanto separar para executar a reposição sugerida usando o custo cadastrado de cada SKU.
            </p>
          </div>

          {purchaseCash.missingCostItems > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold">
              {purchaseCash.missingCostItems} item(ns) sem custo informado
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
          <PurchaseMetric
            title="Investimento sugerido"
            value={money(purchaseCash.total)}
          />
          <PurchaseMetric
            title="Caixa urgente"
            value={money(purchaseCash.urgent)}
          />
          <PurchaseMetric
            title="Caixa classe A"
            value={money(purchaseCash.classA)}
          />
          <PurchaseMetric
            title="Compras normais"
            value={money(purchaseCash.normal)}
          />
          <PurchaseMetric
            title="SKUs para comprar"
            value={String(purchaseCash.itemCount)}
          />
        </div>

        {purchaseCash.missingCostItems > 0 && (
          <p className="text-xs text-orange-300/80 mt-4">
            O total acima não inclui itens cujo custo esteja zerado ou não cadastrado.
            Esses itens aparecem como “Custo não informado” na lista abaixo.
          </p>
        )}

        {prioritizedItems.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-zinc-500 border-b border-white/5">
                  <th className="py-3 pr-4">Produto</th>
                  <th className="py-3 pr-4">Prioridade</th>
                  <th className="py-3 pr-4">Comprar</th>
                  <th className="py-3 pr-4">Custo unit.</th>
                  <th className="py-3">Caixa necessário</th>
                </tr>
              </thead>
              <tbody>
                {prioritizedItems.map((variation) => {
                  const product = data.products.find(
                    (item) => item.id === variation.product_id
                  );
                  const unitCost = Number(variation.purchase_unit_cost || 0);
                  const investment = Number(variation.purchase_investment || 0);
                  const hasCost = Boolean(variation.has_purchase_cost);

                  return (
                    <tr
                      key={`cash-${variation.id}`}
                      className="border-b border-white/5"
                    >
                      <td className="py-4 pr-4">
                        <div className="font-medium text-sm">
                          {product?.name || "Produto"}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {variation.name} · {variation.sku || product?.sku || "-"}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            variation.purchase_priority === "URGENTE"
                              ? "bg-red-500/10 text-red-400"
                              : variation.purchase_priority === "ALTA"
                                ? "bg-orange-500/10 text-orange-400"
                                : "bg-white/5 text-zinc-300"
                          }`}
                        >
                          {variation.purchase_priority === "URGENTE"
                            ? "Urgente"
                            : variation.purchase_priority === "ALTA"
                              ? "Alta"
                              : "Normal"}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-sm font-semibold">
                        {Number(variation.suggested_purchase || 0)} un.
                      </td>
                      <td className="py-4 pr-4 text-sm">
                        {hasCost ? money(unitCost) : (
                          <span className="text-orange-400">
                            Custo não informado
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-sm font-semibold">
                        {hasCost ? money(investment) : (
                          <span className="text-orange-400">
                            Custo não informado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <h2 className="text-xl font-semibold">Compras / Reposição</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Lista de compra calculada com estoque atual, mínimo e previsão dos últimos {Number(data.stockSettings?.forecastDays ?? 30)} dias.
            </p>
          </div>

          <div className="text-xs text-zinc-500 lg:text-right">
            Cobertura planejada: {Number(data.stockSettings?.coverageTargetDays ?? 0)} dias
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          <PurchaseMetric title="Itens para comprar" value={purchaseItems.length.toString()} />
          <PurchaseMetric title="Unidades sugeridas" value={`${totalUnits} un.`} />
          <PurchaseMetric title="Custo estimado" value={money(totalEstimatedCost)} />
          <PurchaseMetric title="Risco antes da chegada" value={riskCount.toString()} danger={riskCount > 0} />
        </div>
      </div>

      <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div>
            <h3 className="font-semibold text-lg">Sugestão de pedido de compra</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Lista pronta com os SKUs que a inteligência de reposição recomenda comprar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["ALL", "Todos"],
              ["URGENT", "Urgentes"],
              ["A", "Classe A"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setPurchaseOrderFilter(value as "ALL" | "URGENT" | "A")
                }
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  purchaseOrderFilter === value
                    ? "bg-white text-black"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={copyPurchaseOrder}
              disabled={purchaseOrderItems.length === 0}
              className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold disabled:opacity-40"
            >
              {purchaseOrderCopied ? "Pedido copiado" : "Copiar pedido"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <PurchaseMetric title="Itens" value={String(purchaseOrderItems.length)} />
          <PurchaseMetric title="Unidades" value={String(purchaseOrderUnits)} />
          <PurchaseMetric title="Valor estimado" value={money(purchaseOrderValue)} />
          <PurchaseMetric
            title="Sem custo"
            value={String(purchaseOrderMissingCost)}
          />
        </div>

        {purchaseOrderItems.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-zinc-500 border-b border-white/5">
                  <th className="py-3 pr-4">Produto / SKU</th>
                  <th className="py-3 pr-4">ABC</th>
                  <th className="py-3 pr-4">Prioridade</th>
                  <th className="py-3 pr-4">Qtd.</th>
                  <th className="py-3 pr-4">Custo unit.</th>
                  <th className="py-3 pr-4">Subtotal</th>
                  <th className="py-3">Pedir até</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrderItems.map((variation) => {
                  const product = data.products.find(
                    (item) => item.id === variation.product_id
                  );
                  const hasCost = Boolean(variation.has_purchase_cost);

                  return (
                    <tr
                      key={`order-${variation.id}`}
                      className="border-b border-white/5"
                    >
                      <td className="py-4 pr-4">
                        <div className="text-sm font-medium">
                          {product?.name || "Produto"}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {variation.name} · {variation.sku || product?.sku || "-"}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm font-bold">
                        {variation.abc_class || "-"}
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            variation.purchase_priority === "URGENTE"
                              ? "bg-red-500/10 text-red-400"
                              : variation.purchase_priority === "ALTA"
                                ? "bg-orange-500/10 text-orange-400"
                                : "bg-white/5 text-zinc-300"
                          }`}
                        >
                          {variation.purchase_priority === "URGENTE"
                            ? "Urgente"
                            : variation.purchase_priority === "ALTA"
                              ? "Alta"
                              : "Normal"}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-sm font-semibold">
                        {Number(variation.suggested_purchase || 0)}
                      </td>
                      <td className="py-4 pr-4 text-sm">
                        {hasCost
                          ? money(Number(variation.purchase_unit_cost || 0))
                          : <span className="text-orange-400">Não informado</span>}
                      </td>
                      <td className="py-4 pr-4 text-sm font-semibold">
                        {hasCost
                          ? money(Number(variation.purchase_investment || 0))
                          : <span className="text-orange-400">Não informado</span>}
                      </td>
                      <td className="py-4 text-sm">
                        {variation.order_by_date
                          ? formatStockDate(variation.order_by_date)
                          : "Sem previsão"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-zinc-500">
            Nenhum SKU encontrado para este filtro.
          </div>
        )}

        <p className="text-xs text-zinc-600 mt-4">
          A sugestão apenas prepara a lista. Nenhuma compra ou mensagem é enviada automaticamente.
        </p>
      </div>

      <div className="bg-[#101116] border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Prioridades de compra</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Ordem operacional cruzando risco de ruptura, Curva ABC, prazo e quantidade sugerida.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold">
              {urgentItems.length} urgente(s)
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-300 text-xs font-semibold">
              {classAItems.length} classe A
            </span>
          </div>
        </div>

        {prioritizedItems.length ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-5">
            {prioritizedItems.slice(0, 6).map((variation) => {
              const product = data.products.find(
                (item) => item.id === variation.product_id
              );

              return (
                <div
                  key={`priority-${variation.id}`}
                  className="rounded-xl bg-white/[0.03] border border-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {product?.name || "Produto"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {variation.name} · {variation.sku || product?.sku || "-"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {variation.abc_class && (
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-xs font-bold">
                          ABC {variation.abc_class}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          variation.purchase_priority === "URGENTE"
                            ? "bg-red-500/10 text-red-400"
                            : variation.purchase_priority === "ALTA"
                              ? "bg-orange-500/10 text-orange-400"
                              : "bg-white/5 text-zinc-300"
                        }`}
                      >
                        {variation.purchase_priority === "URGENTE"
                          ? "Urgente"
                          : variation.purchase_priority === "ALTA"
                            ? "Alta"
                            : "Normal"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                    <div>
                      <div className="text-zinc-500">Estoque</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.stock || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Comprar</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.suggested_purchase || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Cobertura</div>
                      <div className="font-semibold mt-1">
                        {variation.days_of_stock == null
                          ? "Sem histórico"
                          : `${Number(variation.days_of_stock).toFixed(1)} dias`}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Pedir até</div>
                      <div className="font-semibold mt-1">
                        {variation.order_by_date
                          ? formatStockDate(variation.order_by_date)
                          : "Sem previsão"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 py-8 text-center text-sm text-zinc-500">
            Nenhuma compra sugerida agora.
          </div>
        )}
      </div>

      <div className="bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h3 className="font-semibold text-lg">Lista de reposição</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Prioridade automática: risco de ruptura primeiro e, depois, maior quantidade sugerida.
          </p>
        </div>

        {purchaseItems.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-zinc-500 border-b border-white/5">
                  <th className="px-5 py-4">Prioridade</th>
                  <th className="px-5 py-4">Produto</th>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">Estoque</th>
                  <th className="px-5 py-4">Venda média</th>
                  <th className="px-5 py-4">Cobertura</th>
                  <th className="px-5 py-4">Pedir até</th>
                  <th className="px-5 py-4">Ruptura estimada</th>
                  <th className="px-5 py-4">Comprar</th>
                  <th className="px-5 py-4">Custo estimado</th>
                </tr>
              </thead>
              <tbody>
                {prioritizedItems.map((variation) => {
                  const product = data.products.find(
                    (item) => item.id === variation.product_id
                  );
                  const quantity = Number(variation.suggested_purchase ?? 0);
                  const stock = Number(variation.stock ?? 0);
                  const average = Number(variation.average_daily_sales ?? 0);
                  const coverage =
                    variation.days_of_stock === null ||
                    variation.days_of_stock === undefined
                      ? null
                      : Number(variation.days_of_stock);
                  const risk = Boolean(variation.risk_before_arrival);
                  const estimatedCost = quantity * Number(variation.cost ?? 0);

                  return (
                    <tr
                      key={variation.id}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        {risk ? (
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400">
                            Urgente
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-500/10 text-yellow-400">
                            Repor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{product?.name || "Produto"}</div>
                        <div className="text-xs text-zinc-500 mt-1">{variation.name}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-400">
                        {variation.sku || product?.sku || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm">{stock} un.</td>
                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {average > 0 ? `${average.toFixed(2)} un./dia` : "Sem histórico"}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {average > 0 && coverage !== null ? (
                          <span className={risk ? "text-red-400 font-semibold" : "text-zinc-300"}>
                            {coverage.toFixed(1)} dias
                          </span>
                        ) : (
                          <span className="text-zinc-500">Sem histórico</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        {variation.order_by_date ? (
                          <span className={risk ? "text-red-400 font-semibold" : "text-zinc-300"}>
                            {formatStockDate(variation.order_by_date)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Sem histórico</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        {variation.estimated_stockout_date ? (
                          <span className={risk ? "text-red-400" : "text-zinc-300"}>
                            {formatStockDate(variation.estimated_stockout_date)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Sem histórico</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-bold">
                          {quantity} un.
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold">
                        {money(estimatedCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-6 text-center">
            <div className="text-3xl mb-3">✓</div>
            <p className="font-medium">Nenhuma compra necessária agora</p>
            <p className="text-sm text-zinc-500 mt-1">
              O estoque atual atende aos parâmetros de reposição configurados.
            </p>
          </div>
        )}
      </div>

      <StockHistorySection data={data} />
    </section>
  );
}

function formatStockDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function StockHistorySection({ data }: { data: DashboardData }) {
  const withHistory = data.variations
    .filter((variation) => Array.isArray(variation.stock_history) && variation.stock_history.length > 0)
    .slice(0, 6);

  return (
    <div className="bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h3 className="font-semibold text-lg">Histórico de estoque</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Snapshots diários salvos nas sincronizações. O gráfico ganha pontos novos a cada dia.
        </p>
      </div>

      {withHistory.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-5">
          {withHistory.map((variation) => {
            const product = data.products.find((item) => item.id === variation.product_id);
            const history = variation.stock_history || [];
            const values = history.map((entry: any) => Number(entry.stock || 0));
            const max = Math.max(...values, 1);
            const min = Math.min(...values, 0);
            const range = Math.max(max - min, 1);
            const points = history
              .map((entry: any, index: number) => {
                const x = history.length === 1 ? 50 : (index / (history.length - 1)) * 100;
                const y = 90 - ((Number(entry.stock || 0) - min) / range) * 75;
                return `${x},${y}`;
              })
              .join(" ");

            return (
              <div key={variation.id} className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{product?.name || "Produto"}</p>
                    <p className="text-xs text-zinc-500 mt-1">{variation.name}</p>
                  </div>
                  <span className="text-xs text-zinc-400">{Number(variation.stock || 0)} un.</span>
                </div>
                <div className="h-32 mt-4">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" className="text-white/10" strokeWidth="1" />
                    {history.length > 1 ? (
                      <polyline points={points} fill="none" stroke="currentColor" className="text-white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    ) : (
                      <circle cx="50" cy="50" r="2.5" fill="currentColor" className="text-white" />
                    )}
                  </svg>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-600 mt-2">
                  <span>{history[0]?.snapshot_date ? formatStockDate(history[0].snapshot_date) : "-"}</span>
                  <span>{history.at(-1)?.snapshot_date ? formatStockDate(history.at(-1).snapshot_date) : "-"}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 px-6 text-center">
          <p className="font-medium">Histórico começando agora</p>
          <p className="text-sm text-zinc-500 mt-1">
            Depois da primeira sincronização com a nova versão, o sistema começa a registrar um ponto de estoque por dia.
          </p>
        </div>
      )}
    </div>
  );
}

function PurchaseMetric({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-4">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className={`text-xl font-bold mt-2 ${danger ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function StockSettingsCard({
  leadTimeDays,
  safetyDays,
  saving,
  onSave,
}: {
  leadTimeDays: number;
  safetyDays: number;
  saving: boolean;
  onSave: (leadTimeDays: number, safetyDays: number) => void;
}) {
  const [leadTime, setLeadTime] = useState(leadTimeDays.toString());
  const [safety, setSafety] = useState(safetyDays.toString());

  useEffect(() => {
    setLeadTime(leadTimeDays.toString());
    setSafety(safetyDays.toString());
  }, [leadTimeDays, safetyDays]);

  const parsedLeadTime = Number(leadTime);
  const parsedSafety = Number(safety);

  const valid =
    Number.isInteger(parsedLeadTime) &&
    parsedLeadTime >= 0 &&
    parsedLeadTime <= 365 &&
    Number.isInteger(parsedSafety) &&
    parsedSafety >= 0 &&
    parsedSafety <= 365;

  return (
    <section className="bg-[#101116] border border-white/5 rounded-2xl p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <h2 className="text-lg font-semibold">
            Configuração de reposição
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Ajuste o prazo do fornecedor e a margem de segurança usados na previsão.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="block">
            <span className="text-xs text-zinc-500">Prazo de entrega</span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                value={leadTime}
                onChange={(event) => setLeadTime(event.target.value)}
                className="w-24 rounded-xl bg-[#0b0c10] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              />
              <span className="text-sm text-zinc-500">dias</span>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-zinc-500">Margem de segurança</span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                value={safety}
                onChange={(event) => setSafety(event.target.value)}
                className="w-24 rounded-xl bg-[#0b0c10] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              />
              <span className="text-sm text-zinc-500">dias</span>
            </div>
          </label>

          <button
            onClick={() => onSave(parsedLeadTime, parsedSafety)}
            disabled={!valid || saving}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        Cobertura planejada:{" "}
        <span className="text-zinc-300 font-semibold">
          {valid ? parsedLeadTime + parsedSafety : "-"} dias
        </span>
      </div>
    </section>
  );
}

function MinimumStockEditor({
  value,
  saving,
  onSave,
}: {
  value: number;
  saving: boolean;
  onSave: (value: number) => void;
}) {
  const [minimum, setMinimum] = useState(
    value.toString()
  );

  useEffect(() => {
    setMinimum(value.toString());
  }, [value]);

  const parsed = Number(minimum);
  const valid =
    Number.isInteger(parsed) && parsed >= 0;

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        step="1"
        value={minimum}
        onChange={(event) =>
          setMinimum(event.target.value)
        }
        className="w-20 rounded-lg bg-[#0b0c10] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
      />

      <button
        onClick={() => onSave(parsed)}
        disabled={!valid || saving}
        className="px-3 py-2 rounded-lg bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-50"
      >
        {saving ? "..." : "Salvar"}
      </button>
    </div>
  );
}

function ReviewsSection({
  reviews,
  loading,
  message,
  editingReview,
  sendingReview,
  setEditingReview,
  onSync,
  onGenerate,
  onSave,
  onSend,
  onCreateTest,
  onDeleteTest,
}: {
  reviews: Review[];
  loading: boolean;
  message: string;
  editingReview: string | null;
  sendingReview: string | null;
  setEditingReview: (id: string | null) => void;
  onSync: () => void;
  onGenerate: () => void;
  onSave: (
    reviewId: string,
    responseText: string
  ) => void;
  onSend: (reviewId: string) => void;
  onCreateTest: () => void;
  onDeleteTest: (reviewId: string) => void;
}) {
  const pending = reviews.filter(
    (review) =>
      review.response_status !== "SENT"
  ).length;

  return (
    <section className="bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              Avaliações
            </h2>

            <p className="text-sm text-zinc-500 mt-1">
              Prepare, revise e envie respostas para seus clientes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onCreateTest}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/20 disabled:opacity-50"
            >
              🧪 Criar avaliação teste
            </button>

            <button
              onClick={onSync}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/5 text-white text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
            >
              {loading
                ? "Sincronizando..."
                : "Sincronizar"}
            </button>

            <button
              onClick={onGenerate}
              disabled={loading || reviews.length === 0}
              className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50"
            >
              Preparar respostas
            </button>
          </div>
        </div>

        <div className="flex gap-4 mt-5 text-sm">
          <div className="bg-white/[0.03] rounded-xl px-4 py-3">
            <p className="text-zinc-500 text-xs">
              Total
            </p>
            <p className="font-bold mt-1">
              {reviews.length}
            </p>
          </div>

          <div className="bg-white/[0.03] rounded-xl px-4 py-3">
            <p className="text-zinc-500 text-xs">
              Pendentes
            </p>
            <p className="font-bold mt-1">
              {pending}
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 text-sm text-zinc-300">
            {message}
          </div>
        )}
      </div>

      <div className="p-6">
        {reviews.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">
              ⭐
            </div>
            <p className="font-medium">
              Nenhuma avaliação encontrada
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Clique em Sincronizar para buscar avaliações da Shopee.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const prepared =
                review.edited_response ||
                review.ai_response ||
                "";

              const isEditing =
                editingReview === review.id;

              const isSent =
                review.response_status === "SENT";

              return (
                <ReviewCard
                  key={review.id}
                  review={review}
                  prepared={prepared}
                  isEditing={isEditing}
                  isSent={isSent}
                  sending={
                    sendingReview === review.id
                  }
                  onEdit={() =>
                    setEditingReview(review.id)
                  }
                  onCancel={() =>
                    setEditingReview(null)
                  }
                  onSave={(text) =>
                    onSave(review.id, text)
                  }
                  onSend={() =>
                    onSend(review.id)
                  }
                  onDeleteTest={() =>
                    onDeleteTest(review.id)
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewCard({
  review,
  prepared,
  isEditing,
  isSent,
  sending,
  onEdit,
  onCancel,
  onSave,
  onSend,
  onDeleteTest,
}: {
  review: Review;
  prepared: string;
  isEditing: boolean;
  isSent: boolean;
  sending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (text: string) => void;
  onSend: () => void;
  onDeleteTest: () => void;
}) {
  const [text, setText] =
    useState(prepared);

  useEffect(() => {
    setText(prepared);
  }, [prepared]);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="text-lg">
              {"★".repeat(
                Math.max(
                  0,
                  Math.min(5, review.rating)
                )
              )}
              <span className="text-zinc-700">
                {"★".repeat(
                  Math.max(
                    0,
                    5 - Math.min(5, review.rating)
                  )
                )}
              </span>
            </div>

            <span
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                isSent
                  ? "bg-green-500/10 text-green-400"
                  : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {isSent
                ? "Enviada"
                : "Pendente"}
            </span>

            {review.is_test && (
              <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-orange-500/10 text-orange-400">
                TESTE
              </span>
            )}
          </div>

          <p className="font-semibold mt-3">
            {review.username ||
              "Cliente"}
          </p>

          <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">
            {review.comment ||
              "Cliente não deixou comentário."}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-black/20 border border-white/5 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Resposta preparada
          </p>

          {!isSent && prepared && !isEditing && (
            <button
              onClick={onEdit}
              className="text-xs text-zinc-300 hover:text-white"
            >
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <>
            <textarea
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              rows={4}
              className="w-full rounded-xl bg-[#0b0c10] border border-white/10 p-3 text-sm text-white outline-none focus:border-white/30"
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onSave(text)}
                disabled={!text.trim()}
                className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-50"
              >
                Salvar
              </button>

              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg bg-white/5 text-zinc-300 text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
            {prepared ||
              "Nenhuma resposta preparada ainda."}
          </p>
        )}
      </div>

      {review.is_test && !isEditing && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onDeleteTest}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20"
          >
            Excluir teste
          </button>
        </div>
      )}

      {!isSent && prepared && !isEditing && !review.is_test && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onSend}
            disabled={sending}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 disabled:opacity-50"
          >
            {sending
              ? "Enviando..."
              : "ENVIAR PARA SHOPEE"}
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-[#101116] border border-white/5 rounded-2xl p-5">

      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value}
      </p>

      <p className="text-xs text-zinc-600 mt-2">
        {subtitle}
      </p>

    </div>
  );
}

function PerformanceCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-4">

      <p className="text-xs text-zinc-500">
        {title}
      </p>

      <p className="text-xl font-bold mt-2">
        {value}
      </p>

    </div>
  );
}