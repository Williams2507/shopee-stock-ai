import crypto from "crypto";
import { refreshShopeeToken } from "./refresh-token";

const SHOPEE_HOST =
  "https://openplatform.sandbox.test-stable.shopee.sg";

type Store = {
  id: string;
  shop_id: number;
  access_token: string;
  refresh_token: string;
  token_expires_at?: string | null;
};

function generateSign(
  path: string,
  store: Store
) {
  const partnerId =
    process.env.SHOPEE_PARTNER_ID!;

  const partnerKey =
    process.env.SHOPEE_PARTNER_KEY!;

  const timestamp =
    Math.floor(Date.now() / 1000);

  const baseString =
    `${partnerId}${path}${timestamp}${store.access_token}${store.shop_id}`;

  const sign = crypto
    .createHmac("sha256", partnerKey)
    .update(baseString)
    .digest("hex");

  return {
    partnerId,
    timestamp,
    sign,
  };
}

export async function shopeeGet(
  path: string,
  store: Store,
  params: Record<string, string> = {}
) {
  // ==========================================
  // VERIFICA SE O TOKEN ESTÁ PRÓXIMO DE EXPIRAR
  // ==========================================

  let currentStore = store;

  if (store.token_expires_at) {
    const expiresAt =
      new Date(
        store.token_expires_at
      ).getTime();

    const now =
      Date.now();

    // Renova 5 minutos antes de expirar
    const fiveMinutes =
      5 * 60 * 1000;

    if (
      expiresAt - now <=
      fiveMinutes
    ) {
      console.log(
        `Token da loja ${store.shop_id} próximo de expirar. Renovando...`
      );

      const refreshed =
        await refreshShopeeToken(
          store
        );

      currentStore = {
        ...store,
        access_token:
          refreshed.accessToken,
        refresh_token:
          refreshed.refreshToken,
        token_expires_at:
          refreshed.expiresAt,
      };

      console.log(
        `Token da loja ${store.shop_id} renovado com sucesso.`
      );
    }
  }

  // ==========================================
  // GERA ASSINATURA
  // ==========================================

  const {
    partnerId,
    timestamp,
    sign,
  } = generateSign(
    path,
    currentStore
  );

  const url =
    new URL(
      `${SHOPEE_HOST}${path}`
    );

  url.searchParams.set(
    "partner_id",
    partnerId
  );

  url.searchParams.set(
    "timestamp",
    timestamp.toString()
  );

  url.searchParams.set(
    "sign",
    sign
  );

  url.searchParams.set(
    "shop_id",
    currentStore.shop_id.toString()
  );

  url.searchParams.set(
    "access_token",
    currentStore.access_token
  );

  Object.entries(params).forEach(
    ([key, value]) => {
      url.searchParams.set(
        key,
        value
      );
    }
  );

  // ==========================================
  // CHAMADA SHOPEE
  // ==========================================

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          "Content-Type":
            "application/json",
        },
        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    data.error
  ) {
    throw new Error(
      data.message ||
        data.error ||
        "Erro na API da Shopee."
    );
  }

  return data;
}