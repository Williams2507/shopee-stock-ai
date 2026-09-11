import crypto from "crypto";

const SHOPEE_HOST =
  "https://openplatform.sandbox.test-stable.shopee.sg";

type Store = {
  shop_id: number;
  access_token: string;
};

function generateSign(
  path: string,
  store: Store
) {
  const partnerId = process.env.SHOPEE_PARTNER_ID!;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!;

  const timestamp = Math.floor(Date.now() / 1000);

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
  const {
    partnerId,
    timestamp,
    sign,
  } = generateSign(path, store);

  const url = new URL(`${SHOPEE_HOST}${path}`);

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
    store.shop_id.toString()
  );

  url.searchParams.set(
    "access_token",
    store.access_token
  );

  Object.entries(params).forEach(
    ([key, value]) => {
      url.searchParams.set(key, value);
    }
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.message ||
        data.error ||
        "Erro na API da Shopee."
    );
  }

  return data;
}