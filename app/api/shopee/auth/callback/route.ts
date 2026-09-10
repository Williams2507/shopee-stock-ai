import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const shopId = url.searchParams.get("shop_id");

  return NextResponse.json({
    success: true,
    message: "Callback da Shopee recebido.",
    code,
    shopId,
  });
}