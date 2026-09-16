import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { syncProducts } from "@/lib/shopee/sync-products";
import { syncOrders } from "@/lib/shopee/sync-orders";

export async function GET(request: Request) {
  try {
    // Proteção básica do endpoint
    const authHeader =
    request.headers.get("authorization");

    const cronSecret =
    process.env.CRON_SECRET;

    if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
    ) {
    return NextResponse.json(
        {
        success: false,
        error: "Não autorizado.",
        },
        { status: 401 }
    );
    }

    // Busca todas as lojas conectadas
    const { data: stores, error } =
      await supabaseAdmin
        .from("stores")
        .select("*");

    if (error) {
      throw error;
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma loja conectada.",
        stores: 0,
      });
    }

    const results = [];

    for (const store of stores) {
      try {
        // Sincroniza produtos e estoque
        const products =
          await syncProducts(store);

        // Sincroniza pedidos
        const orders =
          await syncOrders(store);

        results.push({
          shopId: store.shop_id,
          success: true,
          products,
          orders,
        });
      } catch (error) {
        console.error(
          `Erro sincronizando loja ${store.shop_id}:`,
          error
        );

        results.push({
          shopId: store.shop_id,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro desconhecido.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída.",
      stores: stores.length,
      results,
    });
  } catch (error) {
    console.error(
      "Erro no cron:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro na sincronização.",
      },
      { status: 500 }
    );
  }
}