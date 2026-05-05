const XML_PRODUCTS_KEY = "sneezy_xml_products";

const cleanText = (value) => {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
};

const getFirstValue = (node, fieldNames = []) => {
  for (const fieldName of fieldNames) {
    const el = node.getElementsByTagName(fieldName)?.[0];

    if (el?.textContent) {
      return cleanText(el.textContent);
    }
  }

  return "";
};

const absolutizeImageUrl = (url) => {
  const value = cleanText(url);

  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  return value;
};

const PRODUCT_NODE_NAMES = [
  "product",
  "item",
  "urun",
  "Urun",
  "Product",
];

const FIELD_ALIASES = {
  id: [
    "id",
    "productId",
    "product_id",
    "urunId",
    "urun_id",
  ],
  name: [
    "name",
    "title",
    "productName",
    "product_name",
    "urunAdi",
    "urun_adi",
    "urunAd",
    "UrunAdi",
  ],
  barcode: [
    "barcode",
    "barkod",
    "ean",
    "gtin",
    "Barcode",
    "Barkod",
  ],
  stock_code: [
    "stockCode",
    "stock_code",
    "productCode",
    "product_code",
    "variantCode",
    "variant_code",
    "varyantKodu",
    "sku",
    "code",
    "kod",
    "ProductCode",
  ],
  image_url: [
  "variant_image1",
  "variantImage1",
  "variant_image",
  "variantImage",
  "variantPicture1",
  "variant_picture1",
  "variantPicture",
  "variant_picture",
  "variant_image_url",
  "variantImageUrl",
  "picture1Path",
  "picturePath1",
  "picture",
  "image",
  "imageUrl",
  "image_url",
  "resim",
  "resim1",
  "mainImage",
],
};

const getProductNodes = (xmlDoc) => {
  const nodes = [];

  PRODUCT_NODE_NAMES.forEach((nodeName) => {
    const found = Array.from(xmlDoc.getElementsByTagName(nodeName));
    nodes.push(...found);
  });

  if (nodes.length > 0) {
    return nodes;
  }

  return Array.from(xmlDoc.getElementsByTagName("*")).filter((node) => {
    const hasCode = getFirstValue(node, FIELD_ALIASES.stock_code);
    const hasBarcode = getFirstValue(node, FIELD_ALIASES.barcode);
    const hasImage = getFirstValue(node, FIELD_ALIASES.image_url);

    return hasCode || hasBarcode || hasImage;
  });
};

export const parseXmlProducts = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const parserError = xmlDoc.getElementsByTagName("parsererror")?.[0];

  if (parserError) {
    throw new Error("XML dosyası okunamadı. Dosya formatını kontrol edin.");
  }

  const productNodes = getProductNodes(xmlDoc);

  const products = productNodes
    .map((node, index) => {
      const barcode = getFirstValue(node, FIELD_ALIASES.barcode);
      const stockCode = getFirstValue(node, FIELD_ALIASES.stock_code);
      const name = getFirstValue(node, FIELD_ALIASES.name);
      const imageUrl = absolutizeImageUrl(
        getFirstValue(node, FIELD_ALIASES.image_url)
      );

      return {
        id: getFirstValue(node, FIELD_ALIASES.id) || `xml_product_${index}`,
        name,
        barcode,
        stock_code: stockCode,
        image_url: imageUrl,
        search_text: [
          name,
          barcode,
          stockCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    })
    .filter((product) => {
      return product.name || product.barcode || product.stock_code || product.image_url;
    });

  return products;
};

export const saveXmlProducts = (products) => {
  localStorage.setItem(XML_PRODUCTS_KEY, JSON.stringify(products || []));
};

export const getXmlProducts = () => {
  try {
    const raw = localStorage.getItem(XML_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearXmlProducts = () => {
  localStorage.removeItem(XML_PRODUCTS_KEY);
};

export const findProductByCode = (code) => {
  const searchValue = cleanText(code).toLowerCase();

  if (!searchValue) return null;

  const products = getXmlProducts();

  const exactMatch = products.find((product) => {
    return (
      cleanText(product.barcode).toLowerCase() === searchValue ||
      cleanText(product.stock_code).toLowerCase() === searchValue
    );
  });

  if (exactMatch) return exactMatch;

  return products.find((product) => {
    return product.search_text?.includes(searchValue);
  }) || null;
};