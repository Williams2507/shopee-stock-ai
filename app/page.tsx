"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  success: boolean;

  period: number;

  products: any[];
  variations: any[];

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

export default function Home() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [period, setPeriod] =
    useState(30);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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
      <div className="max-w-7xl mx-auto px-6 py-8">

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

        {/* ESTOQUE */}

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
                                  stock <= 5
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-green-500/10 text-green-400"
                                }`}
                              >
                                {stock} un.
                              </span>

                            </td>

                          </tr>
                        );
                      }
                    )

                  ) : (

                    <tr>
                      <td
                        colSpan={5}
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

                      return (
                        <div
                          key={variation.id}
                          className="p-4 rounded-xl bg-red-500/5 border border-red-500/10"
                        >

                          <div className="font-medium text-sm">
                            {product?.name ||
                              "Produto"}
                          </div>

                          <div className="text-xs text-zinc-500 mt-1">
                            {variation.name}
                          </div>

                          <div className="text-xs text-red-400 mt-3 font-semibold">
                            Apenas{" "}
                            {variation.stock}{" "}
                            em estoque
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

      </div>
    </main>
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