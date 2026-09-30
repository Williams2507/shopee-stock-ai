import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const catalog = [
  [-910001,-920001,"SIM-CAM-29-KIT","Kit 2 Câmara de Ar Pneu Bike Aro 29",28.90,13.20,86,18],
  [-910002,-920002,"SIM-SINAL-LED","Par Sinalizador LED Duplo Farol Lanterna",25.80,9.40,42,10],
  [-910003,-920003,"SIM-COG-GTA-V","Kit Single Cog GTA 16 Dentes Vermelho",49.90,24.50,34,8],
  [-910004,-920004,"SIM-BOMBA-GTA","Bomba de Ar GTA Portátil Bicicleta MTB",41.90,19.80,29,7],
  [-910005,-920005,"SIM-COG-GTA-P","Kit Single Cog GTA 16 Dentes Preto",49.90,24.50,37,8],
  [-910006,-920006,"SIM-MANOPLA-PR","Par de Manopla Punho Bike Bicicleta Premium",9.90,3.80,118,25],
  [-910007,-920007,"SIM-MANOPLA-165","Manoplas para Bike Bicicleta Patinete 165mm",12.99,4.60,96,22],
  [-910008,-920008,"SIM-MANOPLA-ERG","Par de Manopla Ergonômica GTA MTB BMX",29.99,12.40,53,12],
  [-910009,-920009,"SIM-SELIM-GEL","Banco Selim Gel 2 Molas GTA Largo",40.90,21.30,31,8],
  [-910010,-920010,"SIM-CATRACA-7V","Catraca Roda Livre Bike Bicicleta 7 Velocidades",91.90,49.80,18,6],
  [-910011,-920011,"SIM-SELIM-BMX","Banco de Bike Bicicleta Selim BMX GTA",28.89,15.10,27,7],
  [-910012,-920012,"SIM-PEDAL-GTA","Par de Pedal Bike Bicicleta Plataforma GTA",24.90,11.70,44,10],
  [-910013,-920013,"SIM-DESCANSO","Descanso Lateral Pezinho Alumínio Bike",23.90,10.80,21,7],
  [-910014,-920014,"SIM-CANOTE-CAM","Canote de Selim GTA Camaleão Alumínio",93.10,51.00,13,6],
  [-910015,-920015,"SIM-GUIDAO-GTA","Guidão de Bike Bicicleta MTB Alumínio GTA",64.90,34.50,24,7],
  [-910016,-920016,"SIM-CAM-26-29","Kit Câmara de Ar Bicicleta Aro 26 e 29",49.90,23.90,62,14],
] as const;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores").select("id").eq("user_id", user.id).maybeSingle();

    if (storeError) throw storeError;
    if (!store) return NextResponse.json({ success:false, error:"Loja não encontrada." }, { status:404 });

    for (const [itemId, modelId, sku, name, price, cost, stock, minStock] of catalog) {
      const now = new Date().toISOString();

      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .upsert({
          store_id: store.id, shopee_item_id: itemId, sku, name,
          price, cost, status: "ACTIVE", updated_at: now,
        }, { onConflict: "store_id,shopee_item_id" })
        .select("id").single();

      if (productError || !product) throw productError || new Error(`Erro criando ${name}.`);

      const { error: variationError } = await supabaseAdmin
        .from("product_variations")
        .upsert({
          product_id: product.id, shopee_model_id: modelId, sku,
          name: "Padrão", price, cost, stock, min_stock: minStock,
          updated_at: now,
        }, { onConflict: "product_id,shopee_model_id" });

      if (variationError) throw variationError;
    }

    return NextResponse.json({
      success: true,
      products: catalog.length,
      stock: catalog.reduce((sum, item) => sum + item[6], 0),
    });
  } catch (error) {
    console.error("Erro preparando cenário:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success:false, error:"Não autorizado." }, { status:401 });
    }
    return NextResponse.json({
      success:false,
      error: error instanceof Error ? error.message : "Erro preparando cenário.",
    }, { status:500 });
  }
}
