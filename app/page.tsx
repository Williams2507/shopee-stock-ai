"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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

  const [connectingShopee, setConnectingShopee] =
    useState(false);

  const [connectionMessage, setConnectionMessage] =
    useState("");

  async function authFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      window.location.replace("/login");
      throw new Error("Sessão expirada. Entre novamente.");
    }

    const headers = new Headers(init.headers);
    headers.set(
      "Authorization",
      `Bearer ${session.access_token}`
    );

    return fetch(input, {
      ...init,
      headers,
    });
  }

  async function loadDashboard(
    selectedPeriod = period
  ) {
    try {
      setLoading(true);
      setError("");

      const response = await authFetch(
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
    let mounted = true;

    supabase.auth.getUser().then(({ data: authData }) => {
      if (!mounted) return;
      setUser(authData.user ?? null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authReady && user) {
      loadDashboard(period);
    }
  }, [period, authReady, user]);

  async function connectShopee() {
    try {
      setConnectingShopee(true);
      setConnectionMessage("");

      const response = await authFetch("/api/shopee/auth", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.url) {
        throw new Error(
          result.error || "Não foi possível iniciar a conexão com a Shopee."
        );
      }

      window.location.href = result.url;
    } catch (error) {
      setConnectionMessage(
        error instanceof Error
          ? error.message
          : "Erro ao conectar com a Shopee."
      );
      setConnectingShopee(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }


  async function loadReviews() {
    try {
      setReviewsLoading(true);
      setReviewsMessage("");

      const response = await authFetch(
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

      const response = await authFetch(
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

      const response = await authFetch("/api/reviews/test", {
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

      const response = await authFetch(
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
      const response = await authFetch(
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

      const response = await authFetch("/api/reviews/test/delete", {
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

      const response = await authFetch(
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

      const response = await authFetch("/api/stock/minimum", {
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

      const response = await authFetch("/api/stock/settings", {
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

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center">
        <div className="text-[#475569]">Verificando sua sessão...</div>
      </main>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.replace("/login");
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center">
        <div className="text-[#475569]">Redirecionando para o login...</div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center">
        <div className="text-[#475569]">
          Carregando dashboard...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-6">
            <p className="text-sm text-[#64748B]">Shopee Stock AI</p>
            <h1 className="text-2xl font-bold mt-1">Conecte sua loja Shopee</h1>
            <p className="text-[#475569] mt-3">
              {error}
            </p>

            {connectionMessage && (
              <p className="text-sm text-red-600 mt-4">
                {connectionMessage}
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={connectShopee}
                disabled={connectingShopee}
                className="px-5 py-2.5 rounded-md bg-[#EE4D2D] text-white font-semibold hover:bg-orange-400 disabled:opacity-50 transition"
              >
                {connectingShopee ? "Conectando..." : "Conectar Shopee"}
              </button>

              <button
                onClick={() => loadDashboard()}
                className="px-5 py-2.5 rounded-md bg-[#F1F5F9] text-[#334155] font-semibold hover:bg-slate-100 transition"
              >
                Tentar novamente
              </button>

              <button
                onClick={signOut}
                className="px-5 py-2.5 rounded-md bg-[#F1F5F9] text-[#334155] font-semibold hover:bg-slate-100 transition"
              >
                Sair
              </button>
            </div>
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

  const firstName =
    user.email?.split("@")[0]?.split(/[._-]/)[0] || "vendedor";

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: "⌂" },
    { id: "sales" as const, label: "Vendas", icon: "▥" },
    { id: "purchases" as const, label: "Compras / Reposição", icon: "▣" },
    { id: "reviews" as const, label: "Avaliações", icon: "☆" },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:flex lg:flex-col border-r border-[#E2E8F0] bg-[#FFFFFF] px-4 py-6 sticky top-0 h-screen shrink-0 overflow-y-auto self-start">
          <div className="flex items-center gap-3 px-3 mb-8">
            <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-slate-900 grid place-items-center font-bold shadow-sm shadow-orange-200">
              S
            </div>
            <div>
              <div className="font-extrabold text-[#EE4D2D] leading-tight">Shopee Stock AI</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Gestão inteligente</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === "reviews") loadReviews();
                }}
                className={`w-full flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-left transition ${
                  activeTab === item.id
                    ? "bg-gradient-to-r from-[#EE4D2D] to-[#EE4D2D] text-white shadow-sm"
                    : "text-[#475569] hover:bg-[#FFF1E8] hover:text-[#EE4D2D]"
                }`}
              >
                <span className="text-lg w-5 text-center">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-[#E2E8F0]">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC]"
            >
              <span className="text-lg">↪</span>
              Sair
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-[#FFFFFF]/95 backdrop-blur px-4 md:px-7 py-4">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="lg:hidden h-10 w-10 shrink-0 rounded-md bg-[#EE4D2D] text-white grid place-items-center font-bold">S</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Shopee</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                      Conectada
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] truncate">{user.email}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={connectShopee}
                  disabled={connectingShopee}
                  className="px-4 py-2.5 rounded-md border border-orange-200 bg-slate-50 text-[#EE4D2D] text-sm font-bold hover:bg-slate-100 disabled:opacity-50 transition"
                >
                  {connectingShopee ? "Conectando..." : "Gerenciar conexão"}
                </button>
                <button
                  onClick={() => loadDashboard()}
                  className="px-4 py-2.5 rounded-md bg-[#EE4D2D] text-white text-sm font-bold hover:bg-[#D93F22] shadow-sm transition"
                >
                  ↻ Atualizar dados
                </button>
              </div>
            </div>

            <div className="lg:hidden flex gap-2 overflow-x-auto mt-4 pb-1">
              {navItems.map((item) => (
                <button
                  key={`mobile-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === "reviews") loadReviews();
                  }}
                  className={`shrink-0 px-3 py-2 rounded-md text-xs font-bold ${
                    activeTab === item.id
                      ? "bg-[#EE4D2D] text-white"
                      : "bg-[#F1F5F9] text-[#475569]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          <div className="p-4 md:p-7">
            {connectionMessage && (
              <div className="mb-5 rounded-md border border-orange-100 bg-slate-50 px-4 py-3 text-sm text-orange-700">
                {connectionMessage}
              </div>
            )}

            {activeTab === "dashboard" && (
              <>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm font-semibold text-[#EE4D2D]">Painel operacional</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-normal mt-1 capitalize">
                      Olá, {firstName}!
                    </h1>
                    <p className="text-[#475569] mt-2">Aqui está o resumo da sua operação na Shopee.</p>
                  </div>

                  <div className="flex gap-2">
                    {[1, 7, 30, 90].map((value) => (
                      <button
                        key={value}
                        onClick={() => setPeriod(value)}
                        className={`px-3.5 py-2 rounded-md text-xs font-bold border transition ${
                          period === value
                            ? "bg-[#EE4D2D] border-[#EE4D2D] text-white"
                            : "bg-[#FFFFFF] border-slate-200 text-[#475569] hover:border-orange-200"
                        }`}
                      >
                        {value === 1 ? "Hoje" : `${value} dias`}
                      </button>
                    ))}
                  </div>
                </div>

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                  <LightMetricCard title="Faturamento" value={money(metrics.revenue)} icon="R$" accent="orange" />
                  <LightMetricCard title="Pedidos" value={metrics.orders.toString()} icon="▣" accent="blue" />
                  <LightMetricCard title="Itens vendidos" value={metrics.unitsSold.toString()} icon="□" accent="green" />
                  <LightMetricCard title="Lucro bruto" value={money(metrics.grossProfit)} icon="▥" accent="purple" />
                </section>

                <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  <LightMiniCard title="Produtos" value={metrics.products.toString()} />
                  <LightMiniCard title="Variações" value={metrics.variations.toString()} />
                  <LightMiniCard title="Estoque total" value={metrics.totalStock.toString()} />
                  <LightMiniCard title="Valor em estoque" value={money(metrics.inventoryValue)} />
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_.85fr] gap-5 mb-6">
                  <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div>
                        <h2 className="font-extrabold text-lg">Performance</h2>
                        <p className="text-sm text-[#64748B]">Indicadores do período selecionado</p>
                      </div>
                      <span className="text-xs font-bold text-[#EE4D2D] bg-slate-50 px-3 py-1.5 rounded-lg">
                        {period === 1 ? "Hoje" : `${period} dias`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <LightStat label="Margem" value={`${metrics.margin.toFixed(1)}%`} />
                      <LightStat label="Ticket médio" value={money(metrics.averageOrderValue)} />
                      <LightStat label="Custo dos produtos" value={money(metrics.productCost)} />
                      <LightStat label="Itens para comprar" value={String(purchaseItems.length)} />
                      <LightStat label="Unidades sugeridas" value={String(totalSuggestedPurchase)} />
                      <LightStat label="Risco de ruptura" value={String(riskItems)} />
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-5 shadow-sm">
                    <h2 className="font-extrabold text-lg">Ações rápidas</h2>
                    <p className="text-sm text-[#64748B] mt-1">Atalhos para sua operação</p>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <QuickAction
                        title="Conectar Shopee"
                        subtitle="Gerenciar loja"
                        className="bg-slate-50 text-[#EE4D2D]"
                        onClick={connectShopee}
                      />
                      <QuickAction
                        title="Avaliações"
                        subtitle="Revisar respostas"
                        className="bg-blue-50 text-blue-600"
                        onClick={() => {
                          setActiveTab("reviews");
                          loadReviews();
                        }}
                      />
                      <QuickAction
                        title="Estoque"
                        subtitle="Ver alertas"
                        className="bg-emerald-50 text-emerald-600"
                        onClick={() => document.getElementById("estoque")?.scrollIntoView({ behavior: "smooth" })}
                      />
                      <QuickAction
                        title="Compras"
                        subtitle="Planejar reposição"
                        className="bg-violet-50 text-violet-600"
                        onClick={() => setActiveTab("purchases")}
                      />
                    </div>
                  </div>
                </section>

                <div className="space-y-5">
                  <div className="[&>section]:bg-white [&>section]:text-[#0F172A] [&>section]:border-[#E2E8F0] [&>section]:shadow-sm [&_.text-[#64748B]]:text-[#64748B] [&_.text-[#475569]]:text-[#475569] [&_.text-[#334155]]:text-[#334155]">
                    <AlertsCenter data={data} />
                    <ExecutiveInsights data={data} money={money} />
                    <DemandForecastSection data={data} />
                    <StockTrendSection data={data} />
                    <StockHealthSection data={data} money={money} />
                    <StockSettingsCard
                      leadTimeDays={Number(data.stockSettings?.leadTimeDays ?? 14)}
                      safetyDays={Number(data.stockSettings?.safetyDays ?? 7)}
                      saving={savingStockSettings}
                      onSave={saveStockSettings}
                    />
                  </div>

                  <section id="estoque" className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)] gap-5">
                    <div className="min-w-0 bg-[#FFFFFF] border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-[#E2E8F0]">
                        <h2 className="font-extrabold text-lg">Estoque</h2>
                        <p className="text-sm text-[#64748B] mt-1">
                          Previsão de compra baseada nos últimos {Number(data.stockSettings?.forecastDays ?? 30)} dias
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <span className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-xs text-[#334155] font-semibold">
                            {purchaseItems.length} item(ns) para comprar
                          </span>
                          <span className="px-3 py-1.5 rounded-lg bg-red-50 text-xs font-bold text-red-500">
                            {totalSuggestedPurchase} un. sugeridas
                          </span>
                          {riskItems > 0 && (
                            <span className="px-3 py-1.5 rounded-lg bg-slate-50 text-xs font-bold text-[#EE4D2D]">
                              {riskItems} com risco antes da chegada
                            </span>
                          )}
                        </div>
                        {stockMessage && <p className="text-sm text-[#334155] mt-3">{stockMessage}</p>}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs uppercase text-[#64748B] border-b border-[#E2E8F0]">
                              <th className="px-5 py-4">Produto</th>
                              <th className="px-5 py-4">SKU</th>
                              <th className="px-5 py-4">Preço</th>
                              <th className="px-5 py-4">Custo</th>
                              <th className="px-5 py-4">Estoque</th>
                              <th className="px-5 py-4">Mínimo</th>
                              <th className="px-5 py-4">Cobertura</th>
                              <th className="px-5 py-4">Comprar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stockVariations.length ? stockVariations.map((variation) => {
                              const product = data.products.find((p) => p.id === variation.product_id);
                              const stock = Number(variation.stock || 0);
                              const averageDailySales = Number(variation.average_daily_sales || 0);
                              const coverageDays =
                                variation.days_of_stock == null ? null : Number(variation.days_of_stock);
                              const suggestedPurchase = Number(
                                variation.suggested_purchase ??
                                  Math.max(Number(variation.min_stock ?? 5) - stock, 0)
                              );

                              return (
                                <tr key={variation.id} className="border-b border-[#E2E8F0] hover:bg-slate-50/60">
                                  <td className="px-5 py-4">
                                    <div className="font-semibold text-sm">{product?.name || "Produto"}</div>
                                    <div className="text-xs text-[#64748B] mt-1">{variation.name}</div>
                                  </td>
                                  <td className="px-5 py-4 text-sm text-[#475569]">{variation.sku || product?.sku || "-"}</td>
                                  <td className="px-5 py-4 text-sm">{money(Number(variation.price || 0))}</td>
                                  <td className="px-5 py-4 text-sm text-[#475569]">{money(Number(variation.cost || 0))}</td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      stock <= Number(variation.min_stock ?? 5)
                                        ? "bg-red-50 text-red-500"
                                        : "bg-emerald-50 text-emerald-600"
                                    }`}>
                                      {stock} un.
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <MinimumStockEditor
                                      value={Number(variation.min_stock ?? 5)}
                                      saving={savingMinimum === variation.id}
                                      onSave={(value) => saveMinimumStock(variation.id, value)}
                                    />
                                  </td>
                                  <td className="px-5 py-4 text-sm">
                                    {averageDailySales > 0 && coverageDays !== null
                                      ? `${coverageDays.toFixed(1)} dias`
                                      : "Sem histórico"}
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      suggestedPurchase > 0
                                        ? "bg-red-50 text-red-500"
                                        : "bg-emerald-50 text-emerald-600"
                                    }`}>
                                      {suggestedPurchase} un.
                                    </span>
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr>
                                <td colSpan={8} className="px-5 py-12 text-center text-[#64748B]">
                                  Nenhum produto cadastrado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-[#E2E8F0]">
                        <h2 className="font-extrabold text-lg">Produtos com estoque baixo</h2>
                        <p className="text-sm text-[#64748B] mt-1">O que precisa da sua atenção</p>
                      </div>
                      <div className="p-5 space-y-3">
                        {data.lowStock.length ? data.lowStock.slice(0, 8).map((variation) => {
                          const product = data.products.find((p) => p.id === variation.product_id);
                          return (
                            <div key={variation.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-red-50/60">
                              <div className="min-w-0">
                                <div className="font-semibold text-sm truncate">{product?.name || "Produto"}</div>
                                <div className="text-xs text-[#64748B] truncate">{variation.name}</div>
                              </div>
                              <span className="shrink-0 px-2.5 py-1 rounded-lg bg-white text-red-500 text-xs font-bold">
                                {Number(variation.stock || 0)} un.
                              </span>
                            </div>
                          );
                        }) : (
                          <div className="py-10 text-center">
                            <div className="h-11 w-11 mx-auto rounded-full bg-emerald-50 text-emerald-600 grid place-items-center font-bold">✓</div>
                            <p className="font-bold mt-3">Tudo tranquilo</p>
                            <p className="text-sm text-[#64748B] mt-1">Nenhum item com estoque baixo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </>
            )}

            {activeTab === "sales" && (
              <div className="[&>section]:bg-white [&>section]:text-[#0F172A] [&>section]:border-[#E2E8F0] [&_.text-[#64748B]]:text-[#64748B] [&_.text-[#475569]]:text-[#475569]">
                <SalesSection data={data} money={money} period={period} setPeriod={setPeriod} />
              </div>
            )}

            {activeTab === "purchases" && (
              <div className="[&>section]:bg-white [&>section]:text-[#0F172A] [&>section]:border-[#E2E8F0] [&_.text-[#64748B]]:text-[#64748B] [&_.text-[#475569]]:text-[#475569]">
                <PurchasesSection data={data} purchaseItems={purchaseItems} money={money} />
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="[&>section]:bg-white [&>section]:text-[#0F172A] [&>section]:border-[#E2E8F0] [&_.text-[#64748B]]:text-[#64748B] [&_.text-[#475569]]:text-[#475569] [&_.text-[#334155]]:text-[#334155]">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function LightMetricCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: string;
  accent: "orange" | "blue" | "green" | "purple";
}) {
  const tones = {
    orange: "bg-slate-50 text-[#EE4D2D]",
    blue: "bg-blue-50 text-blue-500",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#475569]">{title}</p>
          <p className="text-2xl font-bold tracking-normal mt-3">{value}</p>
        </div>
        <div className={`h-11 min-w-11 px-2 rounded-lg grid place-items-center text-sm font-bold ${tones[accent]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div className={`h-full w-2/3 rounded-full ${tones[accent].split(" ")[0]}`} />
      </div>
    </div>
  );
}

function LightMiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold text-[#64748B]">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function LightStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#F8FAFC] p-4">
      <p className="text-xs font-semibold text-[#64748B]">{label}</p>
      <p className="font-extrabold mt-1">{value}</p>
    </div>
  );
}

function QuickAction({
  title,
  subtitle,
  className,
  onClick,
}: {
  title: string;
  subtitle: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md p-4 text-left transition hover:-translate-y-0.5 ${className}`}
    >
      <div className="font-extrabold text-sm">{title}</div>
      <div className="text-xs opacity-70 mt-1">{subtitle}</div>
    </button>
  );
}



function DemandForecastSection({
  data,
}: {
  data: DashboardData;
}) {
  const rows = [...data.variations].sort((a, b) => {
    const gapA = a.stock_target_gap == null ? -Infinity : Number(a.stock_target_gap);
    const gapB = b.stock_target_gap == null ? -Infinity : Number(b.stock_target_gap);
    return gapB - gapA;
  });

  const withHistory = rows.filter((item) => item.has_sales_history);
  const belowTarget = withHistory.filter((item) => item.stock_target_status === "ABAIXO_META").length;
  const onTarget = withHistory.filter((item) => item.stock_target_status === "NA_META").length;
  const aboveTarget = withHistory.filter((item) => item.stock_target_status === "ACIMA_META").length;

  function statusLabel(status: string) {
    if (status === "ABAIXO_META") return "Abaixo da meta";
    if (status === "ACIMA_META") return "Acima da meta";
    if (status === "NA_META") return "Na meta";
    return "Sem histórico";
  }

  function statusClass(status: string) {
    if (status === "ABAIXO_META") return "bg-red-50 text-red-600";
    if (status === "ACIMA_META") return "bg-[#F1F5F9] text-[#334155]";
    if (status === "NA_META") return "bg-emerald-50 text-emerald-600";
    return "bg-[#F1F5F9] text-[#64748B]";
  }

  return (
    <section className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6 mb-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Previsão de demanda e meta de estoque</h2>
          <p className="text-sm text-[#64748B] mt-1">
            Projeção baseada na média diária dos 30 dias usados pela inteligência de estoque.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-xs text-[#475569]">
          Cobertura-alvo: {Number(data.stockSettings?.coverageTargetDays || 0)} dias
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <PurchaseMetric title="Com histórico" value={String(withHistory.length)} />
        <PurchaseMetric title="Abaixo da meta" value={String(belowTarget)} />
        <PurchaseMetric title="Na meta" value={String(onTarget)} />
        <PurchaseMetric title="Acima da meta" value={String(aboveTarget)} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase text-[#64748B] border-b border-[#E2E8F0]">
              <th className="py-3 pr-4">Produto / SKU</th>
              <th className="py-3 pr-4">Média/dia</th>
              <th className="py-3 pr-4">7 dias</th>
              <th className="py-3 pr-4">15 dias</th>
              <th className="py-3 pr-4">30 dias</th>
              <th className="py-3 pr-4">Atual</th>
              <th className="py-3 pr-4">Meta</th>
              <th className="py-3 pr-4">Diferença</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((variation) => {
              const product = data.products.find((item) => item.id === variation.product_id);
              const hasHistory = Boolean(variation.has_sales_history);
              const gap = variation.stock_target_gap == null ? null : Number(variation.stock_target_gap);

              return (
                <tr key={`forecast-${variation.id}`} className="border-b border-[#E2E8F0]">
                  <td className="py-4 pr-4">
                    <div className="text-sm font-medium">{product?.name || "Produto"}</div>
                    <div className="text-xs text-[#64748B] mt-1">
                      {variation.name} · {variation.sku || product?.sku || "-"}
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-sm">
                    {hasHistory ? Number(variation.average_daily_sales || 0).toFixed(2) : "Sem histórico"}
                  </td>
                  <td className="py-4 pr-4 text-sm">
                    {hasHistory ? `${Number(variation.demand_projection_7 || 0).toFixed(1)} un.` : "-"}
                  </td>
                  <td className="py-4 pr-4 text-sm">
                    {hasHistory ? `${Number(variation.demand_projection_15 || 0).toFixed(1)} un.` : "-"}
                  </td>
                  <td className="py-4 pr-4 text-sm">
                    {hasHistory ? `${Number(variation.demand_projection_30 || 0).toFixed(1)} un.` : "-"}
                  </td>
                  <td className="py-4 pr-4 text-sm font-semibold">{Number(variation.stock || 0)} un.</td>
                  <td className="py-4 pr-4 text-sm font-semibold">
                    {hasHistory ? `${Number(variation.recommended_stock || 0)} un.` : "-"}
                  </td>
                  <td className="py-4 pr-4 text-sm font-semibold">
                    {gap == null ? "-" : gap > 0 ? `Faltam ${gap} un.` : gap < 0 ? `${Math.abs(gap)} un. acima` : "0 un."}
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${statusClass(variation.stock_target_status)}`}>
                      {statusLabel(variation.stock_target_status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#64748B] mt-4">
        As projeções são estimativas lineares a partir da média diária observada. SKUs sem histórico de vendas não recebem demanda projetada.
      </p>
    </section>
  );
}


function StockTrendSection({
  data,
}: {
  data: DashboardData;
}) {
  const [selectedVariationId, setSelectedVariationId] = useState(
    data.variations?.[0]?.id || ""
  );

  const variation =
    data.variations.find((item) => item.id === selectedVariationId) ||
    data.variations[0];

  if (!variation) return null;

  const product = data.products.find(
    (item) => item.id === variation.product_id
  );

  const history = [...(variation.stock_history || [])]
    .sort(
      (a: any, b: any) =>
        new Date(a.snapshot_date).getTime() -
        new Date(b.snapshot_date).getTime()
    )
    .slice(-30);

  const minStock = Number(variation.min_stock || 0);
  const values = [
    ...history.map((item: any) => Number(item.stock || 0)),
    minStock,
  ];
  const maxStock = Math.max(...values, 1);
  const chartWidth = 900;
  const chartHeight = 240;
  const paddingX = 24;
  const paddingY = 24;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = history.map((item: any, index: number) => {
    const x =
      history.length <= 1
        ? paddingX
        : paddingX + (index / (history.length - 1)) * usableWidth;
    const y =
      paddingY +
      (1 - Number(item.stock || 0) / maxStock) * usableHeight;

    return { x, y, ...item };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const minStockY =
    paddingY + (1 - Math.min(minStock, maxStock) / maxStock) * usableHeight;

  const hasEnoughHistory = history.length >= 2;
  const firstStock = hasEnoughHistory ? Number(history[0].stock || 0) : null;
  const lastStock = history.length
    ? Number(history[history.length - 1].stock || 0)
    : Number(variation.stock || 0);

  const trend =
    hasEnoughHistory && firstStock !== null
      ? lastStock < firstStock
        ? "CAINDO"
        : lastStock > firstStock
          ? "SUBINDO"
          : "ESTAVEL"
      : "SEM_HISTORICO";

  return (
    <section className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6 mb-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Histórico e tendência de estoque</h2>
          <p className="text-sm text-[#64748B] mt-1">
            Evolução dos snapshots diários e referência para reposição.
          </p>
        </div>

        <select
          value={variation.id}
          onChange={(event) => setSelectedVariationId(event.target.value)}
          className="bg-[#FFFFFF] text-[#0F172A] border border-[#CBD5E1] rounded-md px-3 py-2 text-sm outline-none focus:border-[#EE4D2D]"
        >
          {data.variations.map((item) => {
            const itemProduct = data.products.find(
              (productItem) => productItem.id === item.product_id
            );

            return (
              <option key={item.id} value={item.id}>
                {itemProduct?.name || "Produto"} · {item.name}
              </option>
            );
          })}
        </select>
      </div>

      <div className="mt-5">
        <div className="font-medium">
          {product?.name || "Produto"} · {variation.name}
        </div>
        <div className="text-xs text-[#64748B] mt-1">
          SKU: {variation.sku || product?.sku || "-"}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        <PurchaseMetric
          title="Estoque atual"
          value={`${Number(variation.stock || 0)} un.`}
        />
        <PurchaseMetric
          title="Mínimo"
          value={`${minStock} un.`}
        />
        <PurchaseMetric
          title="Tendência"
          value={
            trend === "CAINDO"
              ? "Caindo"
              : trend === "SUBINDO"
                ? "Subindo"
                : trend === "ESTAVEL"
                  ? "Estável"
                  : "Sem histórico"
          }
        />
        <PurchaseMetric
          title="Ruptura estimada"
          value={
            variation.stockout_date
              ? formatStockDate(variation.stockout_date)
              : "Sem previsão"
          }
        />
        <PurchaseMetric
          title="Pedir até"
          value={
            variation.order_by_date
              ? formatStockDate(variation.order_by_date)
              : "Sem previsão"
          }
        />
      </div>

      {hasEnoughHistory ? (
        <div className="mt-6 rounded-md bg-white border border-slate-200 p-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full min-w-[700px] h-[260px]"
            role="img"
            aria-label="Gráfico do histórico de estoque"
          >
            <line
              x1={paddingX}
              x2={chartWidth - paddingX}
              y1={minStockY}
              y2={minStockY}
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeDasharray="8 6"
            />
            <text
              x={paddingX}
              y={Math.max(minStockY - 8, 12)}
              fill="currentColor"
              opacity="0.5"
              fontSize="12"
            >
              mínimo {minStock}
            </text>

            <polyline
              points={polyline}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {points.map((point: any, index: number) => (
              <g key={`${point.snapshot_date}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="currentColor"
                />
                {(index === 0 || index === points.length - 1) && (
                  <>
                    <text
                      x={point.x}
                      y={Math.max(point.y - 10, 12)}
                      textAnchor={index === 0 ? "start" : "end"}
                      fill="currentColor"
                      fontSize="12"
                    >
                      {Number(point.stock || 0)} un.
                    </text>
                    <text
                      x={point.x}
                      y={chartHeight - 5}
                      textAnchor={index === 0 ? "start" : "end"}
                      fill="currentColor"
                      opacity="0.5"
                      fontSize="11"
                    >
                      {formatStockDate(point.snapshot_date)}
                    </text>
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="mt-6 rounded-md bg-white border border-slate-200 py-12 text-center">
          <div className="font-medium">Histórico insuficiente</div>
          <div className="text-sm text-[#64748B] mt-1">
            São necessários pelo menos 2 snapshots diários para mostrar uma tendência.
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-[#64748B]">
        <span>{history.length} snapshot(s) exibido(s)</span>
        <span>·</span>
        <span>Máximo de 30 registros recentes</span>
        <span>·</span>
        <span>Sem histórico suficiente, nenhuma tendência é inventada.</span>
      </div>
    </section>
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
        badge: "bg-red-50 text-red-600",
        border: "border-red-500/10",
        label: "Crítico",
      };
    }

    if (level === "ATENCAO") {
      return {
        badge: "bg-slate-50 text-[#EE4D2D]",
        border: "border-orange-500/10",
        label: "Atenção",
      };
    }

    return {
      badge: "bg-[#F1F5F9] text-[#334155]",
      border: "border-[#E2E8F0]",
      label: "Informação",
    };
  }

  return (
    <section className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6 mb-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Pendências operacionais</h2>
            <span className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-xs font-semibold">
              {alerts.total}
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Itens que requerem acompanhamento da operação.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600">
            {alerts.critical} crítico(s)
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-50 text-[#EE4D2D]">
            {alerts.attention} atenção
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[#475569]">
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
                className={`rounded-md border ${style.border} bg-[#F8FAFC] p-4`}
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

                    <div className="text-sm text-[#334155] mt-3">
                      {product?.name || "Produto"}
                      {variation?.name ? ` · ${variation.name}` : ""}
                    </div>

                    <div className="text-xs text-[#64748B] mt-1">
                      SKU: {variation?.sku || product?.sku || "-"}
                    </div>

                    <div className="text-xs text-[#475569] mt-2">
                      {alert.message}
                    </div>
                  </div>

                  <div className="md:text-right shrink-0">
                    <div className="text-xs text-[#64748B]">Próxima ação</div>
                    <div className="text-sm font-semibold mt-1">
                      {alert.action}
                    </div>
                    {alert.order_by_date && (
                      <div className="text-xs text-[#64748B] mt-2">
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
        <div className="mt-6 py-10 rounded-md bg-[#F8FAFC] text-center">
          <div className="font-medium">Nenhum alerta ativo</div>
          <div className="text-sm text-[#64748B] mt-1">
            Não há nenhuma ação crítica identificada com os dados disponíveis.
          </div>
        </div>
      )}

      {alerts.items.length > 12 && (
        <div className="text-xs text-[#64748B] mt-4">
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
    <section className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6 mb-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <AdsPerformanceDemo />

          <h2 className="text-xl font-semibold">Visão geral</h2>
          <p className="text-sm text-[#64748B] mt-1">
            Indicadores consolidados de vendas, estoque e necessidade de reposição.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-xs text-[#475569]">
          Projeção de estoque · 30 dias
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <PurchaseMetric title="Faturamento" value={money(insights.revenue)} />
        <PurchaseMetric title="Lucro bruto" value={money(insights.grossProfit)} />
        <PurchaseMetric title="Pedidos" value={String(insights.orders)} />
        <PurchaseMetric title="Unidades" value={String(insights.units)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <div className="text-xs font-medium text-red-600">SKUs em risco</div>
          <div className="text-2xl font-bold mt-1">{insights.riskSkus}</div>
          <div className="text-xs text-[#64748B] mt-2">
            Podem acabar antes da reposição chegar.
          </div>
        </div>

        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <div className="text-xs font-medium text-[#EE4D2D]">Classe A crítica</div>
          <div className="text-2xl font-bold mt-1">{insights.criticalClassA}</div>
          <div className="text-xs text-[#64748B] mt-2">
            Itens de maior relevância com compra urgente ou alta.
          </div>
        </div>

        <div className="rounded-md bg-white border border-slate-200 p-4">
          <div className="text-xs text-[#64748B]">Necessidade de compra</div>
          <div className="text-2xl font-bold mt-1">
            {money(insights.purchaseInvestment)}
          </div>
          <div className="text-xs text-[#64748B] mt-2">
            Baseado nos custos cadastrados.
          </div>
        </div>

        <div className="rounded-md bg-white border border-slate-200 p-4">
          <div className="text-xs text-[#64748B]">Estoque excedente estimado</div>
          <div className="text-2xl font-bold mt-1">
            {money(insights.excessCapital)}
          </div>
          <div className="text-xs text-[#64748B] mt-2">
            Estimativa apenas para itens com histórico.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <div className="rounded-md bg-white border border-slate-200 p-5">
          <h3 className="font-semibold">O que exige atenção</h3>

          {actions.length ? (
            <div className="space-y-2 mt-4">
              {actions.map((action, index) => (
                <div
                  key={`${action}-${index}`}
                  className="flex items-center gap-3 rounded-lg bg-[#F8FAFC] px-3 py-3 text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-[#EE4D2D] shrink-0" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#64748B] mt-4">
              Nenhuma ação crítica identificada com os dados disponíveis.
            </div>
          )}
        </div>

        <div className="rounded-md bg-white border border-slate-200 p-5">
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
                    className="flex items-center justify-between gap-4 rounded-lg bg-[#F8FAFC] px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {product?.name || "Produto"}
                      </div>
                      <div className="text-xs text-[#64748B] mt-1">
                        {variation?.name || "Variação"} · comprar{" "}
                        {Number(item.suggested_purchase || 0)} un.
                        {item.abc_class ? ` · ABC ${item.abc_class}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-[#64748B]">Pedir até</div>
                      <div className="text-sm font-semibold mt-1">
                        {formatStockDate(item.order_by_date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-[#64748B] mt-4">
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
    if (value === "RISCO_RUPTURA") return "bg-red-50 text-red-600";
    if (value === "COMPRAR_AGORA") return "bg-slate-50 text-[#EE4D2D]";
    if (value === "EXCESSO") return "bg-amber-50 text-yellow-300";
    if (value === "BAIXO_GIRO") return "bg-[#F1F5F9] text-[#334155]";
    return "bg-emerald-50 text-emerald-600";
  }

  return (
    <section className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6 mb-5">
      <div>
        <h2 className="text-xl font-semibold">Saúde do estoque</h2>
        <p className="text-sm text-[#64748B] mt-1">
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
        <div className="rounded-md bg-[#F8FAFC] p-4">
          <div className="text-xs text-[#64748B]">Unidades em possível excesso</div>
          <div className="text-xl font-bold mt-1">{health.excessUnits} un.</div>
        </div>
        <div className="rounded-md bg-[#F8FAFC] p-4">
          <div className="text-xs text-[#64748B]">Capital estimado no excesso</div>
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
                  className="rounded-md border border-slate-200 bg-[#F8FAFC] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {product?.name || "Produto"}
                      </div>
                      <div className="text-xs text-[#64748B] mt-1">
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
                      <div className="text-[#64748B]">Estoque</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.stock || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Cobertura</div>
                      <div className="font-semibold mt-1">
                        {variation.days_of_stock == null
                          ? "Sem histórico"
                          : `${Number(variation.days_of_stock).toFixed(1)} dias`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Comprar</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.suggested_purchase || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Excesso</div>
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

      <p className="text-xs text-[#64748B] mt-5">
        Possível excesso é uma estimativa baseada em mais de duas vezes a cobertura-alvo.
        Produtos sem histórico de vendas não são classificados como excesso.
      </p>
    </section>
  );
}




function businessPriority(stock: number, minStock: number) {
  const minimum = Math.max(Number(minStock || 0), 1);
  const ratio = Number(stock || 0) / minimum;

  if (ratio < 0.45) {
    return {
      label: "Crítica",
      badge: "bg-red-50 text-red-700 border-red-200",
      order: 0,
    };
  }

  if (ratio < 0.8) {
    return {
      label: "Alta",
      badge: "bg-orange-50 text-orange-700 border-orange-200",
      order: 1,
    };
  }

  if (ratio < 1.15) {
    return {
      label: "Média",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      order: 2,
    };
  }

  return {
    label: "Normal",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    order: 3,
  };
}


const DEMO_ADS_PERIODS = {
  hoje: {
    label: "Hoje (GMT-3)",
    impressions: "8.8k",
    clicks: "336",
    ctr: "3,82%",
    orders: "16",
    items: "16",
    sales: "R$257,06",
    investment: "R$16,00",
    roas: "16,07",
  },
  semana: {
    label: "Última semana (GMT-3)",
    impressions: "101.2k",
    clicks: "3.7k",
    ctr: "3,68%",
    orders: "196",
    items: "199",
    sales: "R$3.309,68",
    investment: "R$220,62",
    roas: "15,00",
  },
  mes: {
    label: "Último mês (GMT-3)",
    impressions: "360.5k",
    clicks: "13.1k",
    ctr: "3,63%",
    orders: "635",
    items: "655",
    sales: "R$10.887,11",
    investment: "R$744,23",
    roas: "14,63",
  },
  trimestre: {
    label: "Últimos 3 meses (GMT-3)",
    impressions: "814.3k",
    clicks: "26.8k",
    ctr: "3,30%",
    orders: "1.1k",
    items: "1.2k",
    sales: "R$24.806,27",
    investment: "R$2.344,97",
    roas: "10,58",
  },
} as const;

function AdsPerformanceDemo() {
  const [period, setPeriod] = useState<keyof typeof DEMO_ADS_PERIODS>("mes");
  const m = DEMO_ADS_PERIODS[period];

  const cards = [
    ["Impressões", m.impressions, ""],
    ["Cliques", m.clicks, "border-t-[3px] border-t-[#2F80ED] shadow-sm"],
    ["CTR", m.ctr, ""],
    ["Pedidos", m.orders, ""],
    ["Itens vendidos", m.items, ""],
    ["Vendas", m.sales, "border-t-[3px] border-t-[#FF6B4A] shadow-sm"],
    ["Investimento", m.investment, ""],
    ["ROAS", m.roas, "border-t-[3px] border-t-[#5B6F95] shadow-sm"],
  ];

  const seed = period === "hoje" ? 3 : period === "semana" ? 7 : period === "mes" ? 11 : 17;
  const count = period === "hoje" ? 28 : period === "semana" ? 34 : period === "mes" ? 38 : 44;
  const series = Array.from({ length: count }, (_, i) => {
    const wave = Math.sin((i + seed) * 0.72) * 18 + Math.sin((i + seed) * 1.91) * 9;
    const trend = period === "trimestre" ? i * 0.7 : period === "mes" ? i * 0.45 : i * 0.15;
    const spike = (i + seed) % 11 === 0 ? 38 : 0;
    return Math.max(2, 28 + wave + trend + spike);
  });
  const sales = series.map((v, i) => Math.max(1, v * (0.56 + 0.22 * Math.sin(i * 1.27)) + ((i + seed) % 13 === 0 ? 30 : 0)));
  const roas = series.map((v, i) => Math.max(3, 22 + Math.sin(i * 0.9) * 8 + ((i + seed) % 17 === 0 ? 36 : 0)));

  const w=1100, h=220, pad=14;
  const max=Math.max(...series,...sales,...roas,1);
  const path=(arr:number[]) => arr.map((v,i)=>{
    const x=pad+(i/(arr.length-1))*(w-pad*2);
    const y=h-pad-(v/max)*(h-pad*2);
    return `${i===0?"M":"L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Desempenho de anúncios</h2>
          <p className="text-sm text-slate-500 mt-1">Indicadores de mídia paga e vendas atribuídas aos anúncios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["hoje","Hoje"],
            ["semana","7 dias"],
            ["mes","30 dias"],
            ["trimestre","3 meses"],
          ] as const).map(([key,label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3.5 py-2 rounded-md border text-sm font-medium transition-colors ${
                period === key
                  ? "border-[#EE4D2D] bg-[#FFF4F1] text-[#EE4D2D]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-end mb-4">
          <div className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 bg-white">
            {m.label}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(([label,value,extra]) => (
            <div key={label} className={`border border-slate-200 rounded-md bg-white px-4 py-4 min-h-[92px] ${extra}`}>
              <div className="text-sm font-medium text-slate-700">{label}</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-5 mt-6 mb-2 text-sm text-slate-600">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#2F80ED]" />Cliques</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />Vendas</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#5B6F95]" />ROAS</span>
        </div>

        <div className="relative h-[250px]">
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
            {[0.15,0.35,0.55,0.75,0.95].map(y => (
              <line key={y} x1="0" x2={w} y1={h*y} y2={h*y} stroke="#D9E2F1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={path(series)} fill="none" stroke="#2F80ED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={path(sales)} fill="none" stroke="#FF6B4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={path(roas)} fill="none" stroke="#5B6F95" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="absolute left-0 right-0 bottom-0 flex justify-between text-[11px] text-slate-500 px-1">
            <span>{period === "hoje" ? "00:00" : period === "semana" ? "19/09" : period === "mes" ? "25/08" : "25/06"}</span>
            <span>{period === "hoje" ? "06:00" : period === "semana" ? "21/09" : period === "mes" ? "04/09" : "21/07"}</span>
            <span>{period === "hoje" ? "12:00" : period === "semana" ? "23/09" : period === "mes" ? "14/09" : "16/08"}</span>
            <span>{period === "hoje" ? "18:00" : "25/09"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RevenueLineChart({
  daily,
  money,
}: {
  daily: any[];
  money: (value: number) => string;
}) {
  const rows = (daily || []).slice(-30);
  if (!rows.length) return null;

  const width = 1040;
  const height = 330;
  const left = 56;
  const right = 22;
  const top = 24;
  const bottom = 46;
  const chartW = width - left - right;
  const chartH = height - top - bottom;

  const revenue = rows.map((item) => Number(item.revenue || 0));
  const orders = rows.map((item) => Number(item.orders || item.order_count || 0));
  const units = rows.map((item) => Number(item.units || item.units_sold || 0));

  const maxRevenue = Math.max(...revenue, 1);
  const maxVolume = Math.max(...orders, ...units, 1);

  const x = (i: number) =>
    left + (rows.length <= 1 ? chartW / 2 : (i / (rows.length - 1)) * chartW);

  const yRevenue = (v: number) => top + chartH - (v / maxRevenue) * chartH;
  const yVolume = (v: number) => top + chartH - (v / maxVolume) * chartH;

  const smoothPath = (values: number[], yFn: (v: number) => number) => {
    const pts = values.map((v, i) => ({ x: x(i), y: yFn(v) }));
    if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const revenuePath = smoothPath(revenue, yRevenue);
  const ordersPath = smoothPath(orders, yVolume);
  const unitsPath = smoothPath(units, yVolume);

  const total = revenue.reduce((sum, value) => sum + value, 0);
  const avg = total / Math.max(rows.length, 1);
  const bestIndex = revenue.indexOf(Math.max(...revenue));

  const hasOrders = orders.some((v) => v > 0);
  const hasUnits = units.some((v) => v > 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="border border-slate-200 rounded-md px-4 py-3 bg-white">
          <div className="text-xs text-slate-500">Média diária</div>
          <div className="text-lg font-semibold text-slate-900 mt-1">{money(avg)}</div>
        </div>
        <div className="border border-slate-200 rounded-md px-4 py-3 bg-white">
          <div className="text-xs text-slate-500">Dia de maior venda</div>
          <div className="text-lg font-semibold text-slate-900 mt-1">
            {formatStockDate(rows[bestIndex]?.date)}
          </div>
        </div>
        <div className="border border-slate-200 rounded-md px-4 py-3 bg-white">
          <div className="text-xs text-slate-500">Maior faturamento diário</div>
          <div className="text-lg font-semibold text-slate-900 mt-1">
            {money(revenue[bestIndex] || 0)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-5 mb-2 text-xs sm:text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EE4D2D]" />
          Faturamento
        </span>
        {hasOrders && (
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F80ED]" />
            Pedidos
          </span>
        )}
        {hasUnits && (
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B6F95]" />
            Unidades
          </span>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[330px]"
          role="img"
          aria-label="Desempenho de vendas por dia"
        >
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
            const yy = top + chartH * ratio;
            const value = maxRevenue * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={yy}
                  y2={yy}
                  stroke="#D9E2F1"
                  strokeWidth="1"
                />
                <text
                  x={left - 10}
                  y={yy + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                >
                  {value >= 1000
                    ? `${(value / 1000).toFixed(1)}k`
                    : Math.round(value)}
                </text>
              </g>
            );
          })}

          <path
            d={revenuePath}
            fill="none"
            stroke="#EE4D2D"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {hasOrders && (
            <path
              d={ordersPath}
              fill="none"
              stroke="#2F80ED"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {hasUnits && (
            <path
              d={unitsPath}
              fill="none"
              stroke="#5B6F95"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {rows.map((row, index) => {
            const show =
              index === 0 ||
              index === rows.length - 1 ||
              index % Math.max(1, Math.ceil(rows.length / 6)) === 0;
            if (!show) return null;

            return (
              <text
                key={`label-${row.date}-${index}`}
                x={x(index)}
                y={height - 12}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
              >
                {formatStockDate(row.date)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ProductShareBars({
  items,
}: {
  items: any[];
}) {
  const rows = (items || []).slice(0, 6);
  const max = Math.max(...rows.map((item) => Number(item.units || 0)), 1);

  if (!rows.length) {
    return <div className="py-12 text-center text-sm text-slate-500">Sem dados no período.</div>;
  }

  return (
    <div className="space-y-4">
      {rows.map((item, index) => {
        const units = Number(item.units || 0);
        const pct = (units / max) * 100;
        return (
          <div key={`share-${item.product_id}-${item.variation_id || index}`}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="text-sm text-slate-700 truncate">
                <span className="font-semibold text-slate-400 mr-2">#{index + 1}</span>
                {item.name}
              </div>
              <div className="text-sm font-semibold text-slate-900 shrink-0">{units} un.</div>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#EE4D2D]"
                style={{ width: `${Math.max(4, pct)}%`, opacity: 1 - index * 0.09 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AbcDistribution({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const total = Math.max((counts.A || 0) + (counts.B || 0) + (counts.C || 0), 1);
  const rows = [
    { key: "A", label: "Classe A", value: counts.A || 0, className: "bg-[#EE4D2D]" },
    { key: "B", label: "Classe B", value: counts.B || 0, className: "bg-amber-400" },
    { key: "C", label: "Classe C", value: counts.C || 0, className: "bg-slate-400" },
  ];

  return (
    <div>
      <div className="h-4 rounded-full bg-slate-100 overflow-hidden flex">
        {rows.map((row) => (
          <div
            key={row.key}
            className={row.className}
            style={{ width: `${(row.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {rows.map((row) => (
          <div key={row.key} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${row.className}`} />
              {row.label}
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">{row.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {((row.value / total) * 100).toFixed(0)}% dos SKUs
            </div>
          </div>
        ))}
      </div>
    </div>
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
      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-xl font-semibold">Vendas</h2>
            <p className="text-sm text-[#64748B] mt-1">
              Acompanhamento de pedidos, receita e volume vendido no período selecionado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 7, 30, 90].map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  period === value
                    ? "bg-[#EE4D2D] text-white border border-[#EE4D2D] shadow-sm"
                    : "bg-white text-slate-600 border border-slate-300 hover:border-[#EE4D2D] hover:text-[#EE4D2D]"
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
        <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg">Vendas por dia</h3>
          <p className="text-sm text-[#64748B] mt-1">
            Evolução das vendas no período selecionado.
          </p>

          {sales.daily.length ? (
            <div className="mt-6">
              <RevenueLineChart daily={sales.daily} money={money} />
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-500">
              Nenhuma venda encontrada neste período.
            </div>
          )}
        </div>

        <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0]">
            <h3 className="font-semibold text-lg">Mais vendidos</h3>
            <p className="text-sm text-[#64748B] mt-1">Ranking por unidades vendidas.</p>
          </div>

          <div className="p-5">
            {sales.topProducts.length ? (
              <div className="space-y-3">
                {sales.topProducts.map((item: any, index: number) => (
                  <div
                    key={`${item.product_id}-${item.variation_id || "product"}-${index}`}
                    className="rounded-md bg-[#F8FAFC] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-[#64748B]">#{index + 1}</div>
                        <div className="font-medium text-sm mt-1">{item.name}</div>
                        <div className="text-xs text-[#64748B] mt-1">{item.sku || "-"}</div>
                      </div>
                      <span className="text-sm font-bold">{Number(item.units || 0)} un.</span>
                    </div>
                    <div className="text-xs text-[#475569] mt-3">
                      Faturamento: {money(Number(item.revenue || 0))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-[#64748B]">
                Sem produtos vendidos no período.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Vendas por produto</h3>
              <p className="text-sm text-slate-500 mt-1">
                Unidades vendidas pelos principais itens no período selecionado.
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-50 text-[#EE4D2D]">
              6 principais
            </span>
          </div>
          <div className="mt-6">
            <ProductShareBars items={sales.topProducts} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg text-slate-900">Classificação ABC</h3>
          <p className="text-sm text-slate-500 mt-1">
            Distribuição dos SKUs conforme participação nas vendas.
          </p>
          <div className="mt-7">
            <AbcDistribution counts={abcCounts} />
          </div>
          <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500">
            Classificação utilizada para apoiar o planejamento de compras e a priorização do estoque.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg">Desempenho por produto</h3>
          <p className="text-sm text-[#64748B] mt-1">Comparação por giro e lucro no período selecionado.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="rounded-md bg-[#F8FAFC] p-4">
              <div className="text-xs text-[#64748B]">Mais vendido</div>
              <div className="font-semibold mt-2">{bestSeller?.name || "Sem vendas"}</div>
              <div className="text-sm text-[#475569] mt-1">
                {bestSeller ? `${Number(bestSeller.units || 0)} un. · ${money(Number(bestSeller.revenue || 0))}` : "Nenhum dado no período"}
              </div>
            </div>
            <div className="rounded-md bg-[#F8FAFC] p-4">
              <div className="text-xs text-[#64748B]">Maior lucro bruto</div>
              <div className="font-semibold mt-2">{mostProfitable?.name || "Sem vendas"}</div>
              <div className="text-sm text-[#475569] mt-1">
                {mostProfitable ? `${money(Number(mostProfitable.profit || 0))} · ${Number(mostProfitable.margin || 0).toFixed(1)}% margem` : "Nenhum dado no período"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg">Curva ABC</h3>
          <p className="text-sm text-[#64748B] mt-1">Classificação pela participação acumulada no faturamento.</p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {(["A", "B", "C"] as const).map((abc) => (
              <div key={abc} className="rounded-md bg-[#F8FAFC] p-4 text-center">
                <div className="text-2xl font-bold">{abcCounts[abc] || 0}</div>
                <div className="text-xs text-[#64748B] mt-1">Classe {abc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#64748B] mt-4">A: até 80% · B: até 95% · C: restante do faturamento acumulado.</p>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-lg">Análise por produto</h3>
          <p className="text-sm text-[#64748B] mt-1">Faturamento, custo, lucro, margem, participação e curva ABC.</p>
        </div>
        {productAnalysis.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-[#64748B] border-b border-[#E2E8F0]">
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
                  <tr key={`${item.product_id}-${item.variation_id || "product"}-${index}`} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-[#64748B] mt-1">{item.variation_name || item.sku || "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">{Number(item.units || 0)}</td>
                    <td className="px-5 py-4 text-sm">{money(Number(item.revenue || 0))}</td>
                    <td className="px-5 py-4 text-sm text-[#475569]">{money(Number(item.cost || 0))}</td>
                    <td className="px-5 py-4 text-sm font-semibold">{money(Number(item.profit || 0))}</td>
                    <td className="px-5 py-4 text-sm">{Number(item.margin || 0).toFixed(1)}%</td>
                    <td className="px-5 py-4 text-sm">{Number(item.revenue_share || 0).toFixed(1)}%</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex min-w-8 justify-center px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-xs font-bold">{item.abc_class || "C"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-6 text-center text-sm text-[#64748B]">Nenhum produto vendido neste período.</div>
        )}
      </div>

      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-lg">Pedidos recentes</h3>
          <p className="text-sm text-[#64748B] mt-1">
            Últimos pedidos válidos sincronizados da Shopee.
          </p>
        </div>

        {sales.recentOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-[#64748B] border-b border-[#E2E8F0]">
                  <th className="px-5 py-4">Pedido</th>
                  <th className="px-5 py-4">Data</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Itens</th>
                  <th className="px-5 py-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <td className="px-5 py-4 text-sm font-medium">
                      {order.order_sn || order.shopee_order_sn || order.id}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#475569] whitespace-nowrap">
                      {formatSalesDate(order.order_date)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-xs text-[#334155]">
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
          <div className="py-16 px-6 text-center text-sm text-[#64748B]">
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
          ? "Alta"
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
      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Planejamento de compras</h3>
            <p className="text-sm text-[#64748B] mt-1">
              Estimativa financeira para atendimento das necessidades de reposição.
            </p>
          </div>

          {purchaseCash.missingCostItems > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 text-[#EE4D2D] text-xs font-semibold">
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
            title="Reposição urgente"
            value={money(purchaseCash.urgent)}
          />
          <PurchaseMetric
            title="Itens classe A"
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
                <tr className="text-left text-xs uppercase text-[#64748B] border-b border-[#E2E8F0]">
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
                      className="border-b border-[#E2E8F0]"
                    >
                      <td className="py-4 pr-4">
                        <div className="font-medium text-sm">
                          {product?.name || "Produto"}
                        </div>
                        <div className="text-xs text-[#64748B] mt-1">
                          {variation.name} · {variation.sku || product?.sku || "-"}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            variation.purchase_priority === "URGENTE"
                              ? "bg-red-50 text-red-600"
                              : variation.purchase_priority === "ALTA"
                                ? "bg-slate-50 text-[#EE4D2D]"
                                : "bg-[#F1F5F9] text-[#334155]"
                          }`}
                        >
                          {variation.purchase_priority === "URGENTE"
                            ? "Alta"
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
                          <span className="text-[#EE4D2D]">
                            Custo não informado
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-sm font-semibold">
                        {hasCost ? money(investment) : (
                          <span className="text-[#EE4D2D]">
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

      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <h2 className="text-xl font-semibold">Compras / Reposição</h2>
            <p className="text-sm text-[#64748B] mt-1">
              Lista de compra calculada com estoque atual, mínimo e previsão dos últimos {Number(data.stockSettings?.forecastDays ?? 30)} dias.
            </p>
          </div>

          <div className="text-xs text-[#64748B] lg:text-right">
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

      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div>
            <h3 className="font-semibold text-lg">Sugestão de pedido de compra</h3>
            <p className="text-sm text-[#64748B] mt-1">
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
                    : "bg-[#F1F5F9] text-[#475569] hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={copyPurchaseOrder}
              disabled={purchaseOrderItems.length === 0}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-900 text-xs font-semibold disabled:opacity-40"
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
                <tr className="text-left text-xs uppercase text-[#64748B] border-b border-[#E2E8F0]">
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
                      className="border-b border-[#E2E8F0]"
                    >
                      <td className="py-4 pr-4">
                        <div className="text-sm font-medium">
                          {product?.name || "Produto"}
                        </div>
                        <div className="text-xs text-[#64748B] mt-1">
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
                              ? "bg-red-50 text-red-600"
                              : variation.purchase_priority === "ALTA"
                                ? "bg-slate-50 text-[#EE4D2D]"
                                : "bg-[#F1F5F9] text-[#334155]"
                          }`}
                        >
                          {variation.purchase_priority === "URGENTE"
                            ? "Alta"
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
                          : <span className="text-[#EE4D2D]">Não informado</span>}
                      </td>
                      <td className="py-4 pr-4 text-sm font-semibold">
                        {hasCost
                          ? money(Number(variation.purchase_investment || 0))
                          : <span className="text-[#EE4D2D]">Não informado</span>}
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
          <div className="py-10 text-center text-sm text-[#64748B]">
            Nenhum SKU encontrado para este filtro.
          </div>
        )}

        <p className="text-xs text-[#64748B] mt-4">
          A sugestão apenas prepara a lista. Nenhuma compra ou mensagem é enviada automaticamente.
        </p>
      </div>

      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Prioridades de compra</h3>
            <p className="text-sm text-[#64748B] mt-1">
              Ordem operacional cruzando risco de ruptura, Curva ABC, prazo e quantidade sugerida.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
              {urgentItems.length} urgente(s)
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[#334155] text-xs font-semibold">
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
                  className="rounded-md bg-white border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {product?.name || "Produto"}
                      </div>
                      <div className="text-xs text-[#64748B] mt-1">
                        {variation.name} · {variation.sku || product?.sku || "-"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {variation.abc_class && (
                        <span className="px-2 py-1 rounded-lg bg-[#F1F5F9] text-xs font-bold">
                          ABC {variation.abc_class}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          variation.purchase_priority === "URGENTE"
                            ? "bg-red-50 text-red-600"
                            : variation.purchase_priority === "ALTA"
                              ? "bg-slate-50 text-[#EE4D2D]"
                              : "bg-[#F1F5F9] text-[#334155]"
                        }`}
                      >
                        {variation.purchase_priority === "URGENTE"
                          ? "Alta"
                          : variation.purchase_priority === "ALTA"
                            ? "Alta"
                            : "Normal"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                    <div>
                      <div className="text-[#64748B]">Estoque</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.stock || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Comprar</div>
                      <div className="font-semibold mt-1">
                        {Number(variation.suggested_purchase || 0)} un.
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Cobertura</div>
                      <div className="font-semibold mt-1">
                        {variation.days_of_stock == null
                          ? "Sem histórico"
                          : `${Number(variation.days_of_stock).toFixed(1)} dias`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Pedir até</div>
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
          <div className="mt-5 py-8 text-center text-sm text-[#64748B]">
            Nenhuma compra sugerida agora.
          </div>
        )}
      </div>

      <div className="bg-[#FFFFFF] border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-lg">Lista de reposição</h3>
          <p className="text-sm text-[#64748B] mt-1">
            Prioridade automática: risco de ruptura primeiro e, depois, maior quantidade sugerida.
          </p>
        </div>

        {purchaseItems.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-[#64748B] border-b border-[#E2E8F0]">
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
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    >
                      <td className="px-5 py-4">
                        {risk ? (
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600">
                            Urgente
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600">
                            Repor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium">{product?.name || "Produto"}</div>
                        <div className="text-xs text-[#64748B] mt-1">{variation.name}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">
                        {variation.sku || product?.sku || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm">{stock} un.</td>
                      <td className="px-5 py-4 text-sm text-[#334155]">
                        {average > 0 ? `${average.toFixed(2)} un./dia` : "Sem histórico"}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {average > 0 && coverage !== null ? (
                          <span className={risk ? "text-red-600 font-semibold" : "text-[#334155]"}>
                            {coverage.toFixed(1)} dias
                          </span>
                        ) : (
                          <span className="text-[#64748B]">Sem histórico</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        {variation.order_by_date ? (
                          <span className={risk ? "text-red-600 font-semibold" : "text-[#334155]"}>
                            {formatStockDate(variation.order_by_date)}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">Sem histórico</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        {variation.estimated_stockout_date ? (
                          <span className={risk ? "text-red-600" : "text-[#334155]"}>
                            {formatStockDate(variation.estimated_stockout_date)}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">Sem histórico</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-bold">
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
            <p className="text-sm text-[#64748B] mt-1">
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
    .filter(
      (variation) =>
        Array.isArray(variation.stock_history) &&
        variation.stock_history.length > 0
    )
    .slice(0, 8);

  const rows = withHistory.map((variation) => {
    const product = data.products.find(
      (item) => item.id === variation.product_id
    );
    const history = variation.stock_history || [];
    const first = Number(history[0]?.stock || 0);
    const current = Number(variation.stock || 0);
    const minStock = Number(variation.min_stock || 0);
    const change = current - first;
    const pct = first > 0 ? (change / first) * 100 : 0;

    return {
      variation,
      product,
      history,
      first,
      current,
      minStock,
      change,
      pct,
    };
  });

  const totalCurrent = rows.reduce((sum, row) => sum + row.current, 0);
  const belowMinimum = rows.filter(
    (row) => row.minStock > 0 && row.current < row.minStock
  ).length;
  const falling = rows.filter((row) => row.change < 0).length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg text-slate-900">
            Histórico de estoque
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Variação do saldo por SKU nos últimos 30 dias.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-600">
              {totalCurrent} un. monitoradas
            </span>
            <span className="px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-600">
              {falling} em queda
            </span>
            <span className="px-3 py-1.5 border border-orange-200 rounded-md bg-orange-50 text-orange-700">
              {belowMinimum} abaixo do mínimo
            </span>
          </div>
        )}
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Produto / SKU
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Estoque atual
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Mínimo
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Variação 30d
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[320px]">
                  Tendência
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Situação
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {rows.map(
                ({
                  variation,
                  product,
                  history,
                  first,
                  current,
                  minStock,
                  change,
                  pct,
                }) => {
                  const values = history.map((entry: any) =>
                    Number(entry.stock || 0)
                  );
                  const max = Math.max(...values, current, 1);
                  const min = Math.min(...values, current, 0);
                  const range = Math.max(max - min, 1);

                  const points = history
                    .map((entry: any, index: number) => {
                      const x =
                        history.length === 1
                          ? 50
                          : 2 + (index / (history.length - 1)) * 96;
                      const y =
                        42 -
                        ((Number(entry.stock || 0) - min) / range) * 32;
                      return `${x},${y}`;
                    })
                    .join(" ");

                  const priority = businessPriority(current, minStock);
                  const isDown = change < 0;
                  const isUp = change > 0;

                  return (
                    <tr
                      key={variation.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-sm text-slate-900 max-w-[360px] truncate">
                          {product?.name || "Produto"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {variation.name}
                          {variation.sku ? ` · ${variation.sku}` : ""}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          {current} un.
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {minStock > 0 ? `${minStock} un.` : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <div
                          className={`text-sm font-semibold ${
                            isDown
                              ? "text-red-600"
                              : isUp
                              ? "text-emerald-600"
                              : "text-slate-600"
                          }`}
                        >
                          {change > 0 ? "+" : ""}
                          {change} un.
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {first > 0
                            ? `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`
                            : "sem base"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <svg
                          viewBox="0 0 100 48"
                          preserveAspectRatio="none"
                          className="w-full h-12"
                          aria-label="Tendência do estoque"
                        >
                          <line
                            x1="0"
                            y1="43"
                            x2="100"
                            y2="43"
                            stroke="#E2E8F0"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                          />
                          {history.length > 1 ? (
                            <polyline
                              points={points}
                              fill="none"
                              stroke={
                                priority.label === "Crítica"
                                  ? "#DC2626"
                                  : priority.label === "Alta"
                                  ? "#EA580C"
                                  : "#475569"
                              }
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          ) : (
                            <circle
                              cx="50"
                              cy="24"
                              r="2.5"
                              fill="#475569"
                            />
                          )}
                        </svg>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>
                            {history[0]?.snapshot_date
                              ? formatStockDate(history[0].snapshot_date)
                              : "-"}
                          </span>
                          <span>
                            {history.at(-1)?.snapshot_date
                              ? formatStockDate(history.at(-1).snapshot_date)
                              : "-"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md border text-xs font-semibold ${priority.badge}`}
                        >
                          {priority.label}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 px-6 text-center">
          <p className="font-medium text-slate-900">
            Histórico ainda não disponível
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Os registros serão exibidos após as próximas sincronizações de estoque.
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
    <div className="bg-[#F8FAFC] rounded-md p-4">
      <p className="text-xs text-[#64748B]">{title}</p>
      <p className={`text-xl font-bold mt-2 ${danger ? "text-red-600" : "text-slate-900"}`}>
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
    <section className="bg-[#FFFFFF] border border-slate-200 rounded-md p-4 mb-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <h2 className="text-lg font-semibold">
            Configuração de reposição
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            Ajuste o prazo do fornecedor e a margem de segurança usados na previsão.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="block">
            <span className="text-xs text-[#64748B]">Prazo de entrega</span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                value={leadTime}
                onChange={(event) => setLeadTime(event.target.value)}
                className="w-24 rounded-md bg-white border border-[#CBD5E1] px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-white/30"
              />
              <span className="text-sm text-[#64748B]">dias</span>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-[#64748B]">Margem de segurança</span>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                value={safety}
                onChange={(event) => setSafety(event.target.value)}
                className="w-24 rounded-md bg-white border border-[#CBD5E1] px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-white/30"
              />
              <span className="text-sm text-[#64748B]">dias</span>
            </div>
          </label>

          <button
            onClick={() => onSave(parsedLeadTime, parsedSafety)}
            disabled={!valid || saving}
            className="px-5 py-2.5 rounded-md bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-[#64748B]">
        Cobertura planejada:{" "}
        <span className="text-[#334155] font-semibold">
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
        className="w-20 rounded-lg bg-white border border-[#CBD5E1] px-3 py-2 text-sm text-slate-900 outline-none focus:border-white/30"
      />

      <button
        onClick={() => onSave(parsed)}
        disabled={!valid || saving}
        className="px-3 py-2 rounded-lg bg-[#F1F5F9] text-xs font-semibold text-[#334155] hover:bg-slate-100 disabled:opacity-50"
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
    <section className="bg-[#FFFFFF] border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-[#E2E8F0]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              Avaliações
            </h2>

            <p className="text-sm text-[#64748B] mt-1">
              Prepare, revise e envie respostas para seus clientes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onCreateTest}
              disabled={loading}
              className="px-4 py-2.5 rounded-md bg-amber-50 text-amber-600 text-sm font-semibold hover:bg-yellow-500/20 disabled:opacity-50"
            >
              🧪 Criar avaliação teste
            </button>

            <button
              onClick={onSync}
              disabled={loading}
              className="px-4 py-2.5 rounded-md bg-[#F1F5F9] text-slate-900 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
            >
              {loading
                ? "Sincronizando..."
                : "Sincronizar"}
            </button>

            <button
              onClick={onGenerate}
              disabled={loading || reviews.length === 0}
              className="px-4 py-2.5 rounded-md bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50"
            >
              Revisar respostas
            </button>
          </div>
        </div>

        <div className="flex gap-4 mt-5 text-sm">
          <div className="bg-[#F8FAFC] rounded-md px-4 py-3">
            <p className="text-[#64748B] text-xs">
              Total
            </p>
            <p className="font-bold mt-1">
              {reviews.length}
            </p>
          </div>

          <div className="bg-[#F8FAFC] rounded-md px-4 py-3">
            <p className="text-[#64748B] text-xs">
              Pendentes
            </p>
            <p className="font-bold mt-1">
              {pending}
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-md bg-white border border-slate-200 px-4 py-3 text-sm text-[#334155]">
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
            <p className="text-sm text-[#64748B] mt-1">
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
    <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-5">
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
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {isSent
                ? "Enviada"
                : "Pendente"}
            </span>

            {review.is_test && (
              <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-slate-50 text-[#EE4D2D]">
                TESTE
              </span>
            )}
          </div>

          <p className="font-semibold mt-3">
            {review.username ||
              "Cliente"}
          </p>

          <p className="text-sm text-[#475569] mt-2 whitespace-pre-wrap">
            {review.comment ||
              "Cliente não deixou comentário."}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-white/20 border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">
            Resposta preparada
          </p>

          {!isSent && prepared && !isEditing && (
            <button
              onClick={onEdit}
              className="text-xs text-[#334155] hover:text-slate-900"
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
              className="w-full rounded-md bg-white border border-[#CBD5E1] p-3 text-sm text-slate-900 outline-none focus:border-white/30"
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
                className="px-4 py-2 rounded-lg bg-[#F1F5F9] text-[#334155] text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#334155] whitespace-pre-wrap">
            {prepared ||
              "Nenhuma resposta preparada ainda."}
          </p>
        )}
      </div>

      {review.is_test && !isEditing && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onDeleteTest}
            className="px-4 py-2.5 rounded-md bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-500/20"
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
            className="px-5 py-2.5 rounded-md bg-white text-black text-sm font-bold hover:bg-zinc-200 disabled:opacity-50"
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
    <div className="bg-[#FFFFFF] border border-slate-200 rounded-md p-4">

      <p className="text-sm text-[#64748B]">
        {title}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value}
      </p>

      <p className="text-xs text-[#64748B] mt-2">
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
    <div className="bg-[#F8FAFC] rounded-md p-4">

      <p className="text-xs text-[#64748B]">
        {title}
      </p>

      <p className="text-xl font-bold mt-2">
        {value}
      </p>

    </div>
  );
}