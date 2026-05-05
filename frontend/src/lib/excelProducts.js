import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import {
  indexedDbSet,
  indexedDbGet,
  indexedDbRemove,
} from "@/lib/indexedDbStorage";

const PRODUCT_DATA_PREVIEW_KEY = "sneezy_excel_products_preview";
const PRODUCT_DATA_UPDATED_AT_KEY = "sneezy_excel_products_updated_at";

const clean = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalize = (value) => clean(value).toLowerCase();

const firstValue = (row, keys = []) => {
  for (const key of keys) {
    const value = clean(row[key]);
    if (value) return value;
  }

  return "";
};

const collectImages = (row) => {
  return [
    row.ImageURL1,
    row.ImageURL2,
    row.ImageURL3,
    row.ImageURL4,
    row.ImageURL5,
  ]
    .map(clean)
    .filter(Boolean);
};

const getErrorMessage = (error, fallback = "İşlem başarısız oldu") => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const parseProductExcelFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  const products = rows
    .map((row, index) => {
      const stockCode = firstValue(row, [
        "Seçenek-Ürün-Kodu",
        "Urun-Kodu",
        "Mağaza Ürün Kodu",
        "Varyant Kodu",
      ]);

      const barcode = firstValue(row, [
        "Secenek-Barcode",
        "Barcode",
        "Barkod",
      ]);

      const images = collectImages(row);

      return {
        id: `${clean(row.UrunID) || "product"}_${clean(row.VaryantID) || index}`,
        product_id: clean(row.UrunID),
        variant_id: clean(row.VaryantID),
        stock_code: stockCode,
        main_stock_code: clean(row["Ana Ürün Kodu"]),
        product_name: clean(row.UrunAdi),
        barcode,
        stock_quantity: Number(clean(row["Ürün Adedi"])) || 0,
        variant_name: firstValue(row, ["Seçenekler", "Seçenekler-2"]),
        variant_option_1: clean(row.Seçenekler),
        variant_option_2: clean(row["Seçenekler-2"]),
        image_url: images[0] || "",
        image_urls: images,
        search_text: [
          stockCode,
          barcode,
          clean(row.UrunID),
          clean(row.VaryantID),
          clean(row.UrunAdi),
          clean(row["Ana Ürün Kodu"]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    })
    .filter((product) => product.stock_code || product.barcode || product.product_id);

  return products;
};

export const saveProductData = async (products) => {
  try {
    const payload = {
      products: products || [],
    };

    const res = await api.post("/product-data/import", payload);

    const previewProducts = (products || []).slice(0, 100);
    await indexedDbSet(PRODUCT_DATA_PREVIEW_KEY, previewProducts);

    if (res.data?.updated_at) {
      localStorage.setItem(PRODUCT_DATA_UPDATED_AT_KEY, res.data.updated_at);
    }

    return res.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Ürün data backend’e aktarılamadı"));
  }
};

export const getProductData = async () => {
  try {
    const preview = await indexedDbGet(PRODUCT_DATA_PREVIEW_KEY, []);
    return Array.isArray(preview) ? preview : [];
  } catch {
    return [];
  }
};

export const getProductDataStats = async () => {
  try {
    const res = await api.get("/product-data/stats");

    if (res.data?.updated_at) {
      localStorage.setItem(PRODUCT_DATA_UPDATED_AT_KEY, res.data.updated_at);
    }

    return {
      count: Number(res.data?.count) || 0,
      updated_at: res.data?.updated_at || "",
    };
  } catch {
    return {
      count: 0,
      updated_at: "",
    };
  }
};

export const clearProductData = async () => {
  try {
    await api.delete("/product-data");
    await indexedDbRemove(PRODUCT_DATA_PREVIEW_KEY);
    localStorage.removeItem(PRODUCT_DATA_UPDATED_AT_KEY);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Ürün data temizlenemedi"));
  }
};

export const searchProductsFromData = async (query, limit = 15) => {
  const q = clean(query);

  if (!q) return [];

  try {
    const res = await api.get("/product-data/search", {
      params: {
        q,
        limit,
      },
    });

    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const findProductFromData = async ({
  stockCode,
  barcode,
  productId,
  variantId,
}) => {
  const searchValues = [
    stockCode,
    barcode,
    variantId,
    productId,
  ]
    .map(clean)
    .filter(Boolean);

  for (const value of searchValues) {
    const results = await searchProductsFromData(value, 25);
    const normalizedValue = normalize(value);

    const exact =
      results.find((product) => normalize(product.stock_code) === normalizedValue) ||
      results.find((product) => normalize(product.barcode) === normalizedValue) ||
      results.find((product) => normalize(product.variant_id) === normalizedValue) ||
      results.find((product) => normalize(product.product_id) === normalizedValue);

    if (exact) return exact;

    if (results.length > 0) return results[0];
  }

  return null;
};

export const parseOrderExcelFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  const parsedRows = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    const stockCode = firstValue(row, [
      "Varyant Kodu",
      "Mağaza Ürün Kodu",
    ]);

    const barcode = firstValue(row, ["Barkod"]);

    const product = await findProductFromData({
      stockCode,
      barcode,
      productId: row["Ürün Id"],
      variantId: row["Varyant Id"],
    });

    const quantity = Number(clean(row.Adet)) || 1;

    parsedRows.push({
      order_row_id: `order_${Date.now()}_${index}`,
      product_id: clean(row["Ürün Id"]),
      variant_id: clean(row["Varyant Id"]),
      stock_code: stockCode,
      barcode,
      quantity,
      matched: Boolean(product),
      product,
      raw: row,
    });
  }

  return parsedRows.filter(
    (item) => item.stock_code || item.barcode || item.product_id
  );
};