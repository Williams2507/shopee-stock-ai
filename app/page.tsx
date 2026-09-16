"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  success: boolean;

  period: number;

  stockSettings: {
    leadTimeDays: number;
    safetyDays: number;
    coverageTargetDays: number;
  };

  products: any[];
  variations: any[];
  orderItems: any[];

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
    useState<"dashboard" | "reviews">("dashboard");

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

        {/* CONFIGURAÇÃO DE REPOSIÇÃO */}

        <StockSettingsCard
          leadTimeDays={Number(data.stockSettings?.leadTimeDays ?? 14)}
          safetyDays={Number(data.stockSettings?.safetyDays ?? 7)}
          saving={savingStockSettings}
          onSave={saveStockSettings}
        />

        {/* ESTOQUE + ALERTAS */}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 bg-[#101116] border border-white/5 rounded-2xl overflow-hidden">

            <div className="p-5 border-b border-white/5">

              <h2 className="font-semibold text-lg">
                Estoque
              </h2>

              <p className="text-sm text-zinc-500">
                Produtos cadastrados no sistema
              </p>

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

                  {data.variations.length ? (

                    data.variations.map(
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