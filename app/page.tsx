"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  cost: number;
  status: string;
};

type Variation = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  cost: number;
  stock: number;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard");
        const data = await response.json();

        if (data.success) {
          setProducts(data.products);
          setVariations(data.variations);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalStock = variations.reduce(
    (total, variation) => total + Number(variation.stock || 0),
    0
  );

  const inventoryValue = variations.reduce(
    (total, variation) =>
      total +
      Number(variation.stock || 0) *
        Number(variation.cost || 0),
    0
  );

  const potentialRevenue = variations.reduce(
    (total, variation) =>
      total +
      Number(variation.stock || 0) *
        Number(variation.price || 0),
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

  const lowStock = variations.filter(
    (variation) => Number(variation.stock) <= 5
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">
          Carregando dashboard...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* HEADER */}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Dashboard
            </h1>

            <p className="text-zinc-400 mt-1">
              Visão geral da sua loja Shopee
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200"
          >
            Atualizar
          </button>
        </div>

        {/* CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">

          <MetricCard
            title="Produtos"
            value={products.length.toString()}
            description="Produtos cadastrados"
          />

          <MetricCard
            title="Estoque"
            value={totalStock.toString()}
            description="Unidades disponíveis"
          />

          <MetricCard
            title="Valor do estoque"
            value={formatMoney(inventoryValue)}
            description="Custo dos produtos"
          />

          <MetricCard
            title="Lucro potencial"
            value={formatMoney(potentialProfit)}
            description="Se todo estoque vender"
          />

        </div>

        {/* SEGUNDA LINHA */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* RESUMO */}

          <section className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

            <div className="flex justify-between items-center mb-6">

              <div>
                <h2 className="text-xl font-semibold">
                  Estoque
                </h2>

                <p className="text-zinc-500 text-sm">
                  Produtos cadastrados no sistema
                </p>
              </div>

              <span className="text-sm text-zinc-400">
                {variations.length} variações
              </span>

            </div>

            <div className="space-y-3">

              {variations.map((variation) => {

                const product = products.find(
                  (product) =>
                    product.id === variation.product_id
                );

                return (
                  <div
                    key={variation.id}
                    className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-4"
                  >

                    <div>
                      <p className="font-medium">
                        {product?.name || "Produto"}
                      </p>

                      <p className="text-sm text-zinc-500">
                        {variation.name}
                        {variation.sku
                          ? ` • ${variation.sku}`
                          : ""}
                      </p>
                    </div>

                    <div className="text-right">

                      <p className="font-semibold">
                        {variation.stock} un.
                      </p>

                      <p
                        className={`text-sm ${
                          variation.stock <= 5
                            ? "text-red-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {variation.stock <= 5
                          ? "Estoque baixo"
                          : "Estoque normal"}
                      </p>

                    </div>

                  </div>
                );
              })}

            </div>

          </section>

          {/* ALERTAS */}

          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

            <h2 className="text-xl font-semibold mb-1">
              Alertas
            </h2>

            <p className="text-zinc-500 text-sm mb-6">
              O que precisa da sua atenção
            </p>

            {lowStock.length === 0 ? (

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="font-medium">
                  Tudo tranquilo 👍
                </p>

                <p className="text-sm text-zinc-500 mt-1">
                  Nenhuma variação está com estoque baixo.
                </p>
              </div>

            ) : (

              <div className="space-y-3">

                {lowStock.map((variation) => (

                  <div
                    key={variation.id}
                    className="bg-zinc-950 border border-red-900/50 rounded-xl p-4"
                  >

                    <p className="font-medium text-red-400">
                      Estoque baixo
                    </p>

                    <p className="text-sm text-zinc-400 mt-1">
                      {variation.name} —{" "}
                      {variation.stock} unidades
                    </p>

                  </div>

                ))}

              </div>

            )}

          </section>

        </div>

        {/* MÉTRICAS FUTURAS */}

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h2 className="text-xl font-semibold">
                Performance
              </h2>

              <p className="text-zinc-500 text-sm">
                Métricas que serão alimentadas automaticamente pela Shopee
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs">
              Sincronização em desenvolvimento
            </span>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <FutureMetric
              title="Faturamento"
              value="R$ 0,00"
            />

            <FutureMetric
              title="Pedidos"
              value="0"
            />

            <FutureMetric
              title="Lucro"
              value="R$ 0,00"
            />

            <FutureMetric
              title="Avaliações pendentes"
              value="0"
            />

          </div>

        </section>

      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value}
      </p>

      <p className="text-xs text-zinc-600 mt-2">
        {description}
      </p>

    </div>
  );
}

function FutureMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">

      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="text-xl font-bold mt-2">
        {value}
      </p>

    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}