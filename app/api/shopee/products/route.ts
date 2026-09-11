const path = "/api/v2/product/get_item_list";
const timestamp = Math.floor(Date.now() / 1000);

const baseString =
  `${partnerId}${path}${timestamp}${store.access_token}${store.shop_id}`;

const sign = crypto
  .createHmac("sha256", partnerKey)
  .update(baseString)
  .digest("hex");

const apiUrl =
  `https://openplatform.sandbox.test-stable.shopee.sg${path}` +
  `?partner_id=${partnerId}` +
  `&timestamp=${timestamp}` +
  `&sign=${sign}` +
  `&shop_id=${store.shop_id}` +
  `&access_token=${encodeURIComponent(store.access_token)}` +
  `&offset=0` +
  `&page_size=50` +
  `&item_status=NORMAL`;

const response = await fetch(apiUrl, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});

const data = await response.json();