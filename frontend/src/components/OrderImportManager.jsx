import { useEffect, useState } from "react";
import {
  X,
  UploadSimple,
  Package,
  CheckCircle,
  WarningCircle,
  } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { parseOrderExcelFile, getProductData } from "@/lib/excelProducts";
import { toast } from "sonner";

export default function OrderImportManager({ onClose, lists, onImportOrders }) {
  const [rows, setRows] = useState([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mergeSameStock, setMergeSameStock] = useState(true);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const loadProductCount = async () => {
      try {
        const products = await getProductData();
        setProductCount(Array.isArray(products) ? products.length : 0);
      } catch {
        setProductCount(0);
      }
    };

    loadProductCount();
  }, []);

  const handleOrderFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);

    try {
      const parsedRows = await parseOrderExcelFile(file);
      setRows(parsedRows);
      toast.success(`${parsedRows.length} sipariş satırı okundu`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Sipariş Excel dosyası okunamadı");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const matchedCount = rows.filter((row) => row.matched).length;
  const unmatchedCount = rows.length - matchedCount;

  const uniqueStockCount = new Set(
    rows.map((row) => row.product?.stock_code || row.stock_code || row.barcode || row.product_id)
  ).size;

  const handleImport = () => {
    if (rows.length === 0) {
      toast.error("Önce sipariş Excel dosyası yükleyin");
      return;
    }

    onImportOrders({
      rows,
      listId: selectedListId || null,
      mergeSameStock,
    });

    toast.success(`${rows.length} sipariş satırı aktarıma gönderildi`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 flex justify-center">
      <div className="w-full max-w-6xl max-h-[92vh] bg-white border border-slate-200 shadow-[0_30px_100px_rgba(15,23,42,0.28)] overflow-hidden flex flex-col">
        <div className="px-5 sm:px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#002FA7] mb-1">
              Sneezy Sipariş
            </div>
            <h2 className="font-display text-2xl font-black tracking-tight text-slate-900">
              Sipariş Excel İçe Aktar
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sipariş Excel dosyasını yükleyin. Satırlar ürün data ile eşleşerek göreve dönüştürülecek.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-none border border-slate-200 hover:bg-slate-50 flex-shrink-0"
          >
            <X size={22} />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 grid lg:grid-cols-[340px_1fr] gap-6">
          <div className="border border-slate-200 bg-slate-50 p-5 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Package size={20} className="text-[#002FA7]" />
              <div className="font-semibold text-slate-900">
                Sipariş Aktarımı
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-5 space-y-2">
              <div>
                Ürün data kayıt sayısı:
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {productCount.toLocaleString("tr-TR")}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3">
                <div className="border border-emerald-100 bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-700 font-bold">
                    Eşleşen
                  </div>
                  <div className="text-xl font-black text-emerald-700">
                    {matchedCount}
                  </div>
                </div>

                <div className="border border-red-100 bg-red-50 p-3">
                  <div className="text-xs text-red-700 font-bold">
                    Eşleşmeyen
                  </div>
                  <div className="text-xl font-black text-red-700">
                    {unmatchedCount}
                  </div>
                </div>

                <div className="border border-blue-100 bg-blue-50 p-3">
                  <div className="text-xs text-[#002FA7] font-bold">
                    Tekil
                  </div>
                  <div className="text-xl font-black text-[#002FA7]">
                    {uniqueStockCount}
                  </div>
                </div>
              </div>
            </div>

            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleOrderFile}
                className="hidden"
                disabled={loading}
              />

              <div className="w-full h-12 bg-[#002FA7] hover:bg-[#00227A] text-white flex items-center justify-center font-semibold">
                <UploadSimple size={18} className="mr-2" />
                {loading ? "Yükleniyor..." : "Sipariş Excel Yükle"}
              </div>
            </label>

            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Aktarılacak Liste
              </label>

              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="mt-2 w-full h-11 border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Otomatik / Aktif Liste</option>
                {lists.map((list) => (
                  <option key={list.list_id} value={list.list_id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="mt-4 flex items-start gap-3 border border-slate-200 bg-white p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mergeSameStock}
                onChange={(e) => setMergeSameStock(e.target.checked)}
                className="mt-1"
              />

              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Package size={17} className="text-[#002FA7]" />
                  Aynı stok kodlarını birleştir
                </div>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Aynı stok kodu siparişte birden fazla kez geçerse tek görev oluşturur ve adetleri toplar.
                </div>
              </div>
            </label>

            <Button
              type="button"
              onClick={handleImport}
              disabled={rows.length === 0}
              className="w-full mt-4 rounded-none bg-[#002FA7] hover:bg-[#00227A]"
            >
              Görevlere Aktar
            </Button>

            <div className="mt-5 text-xs text-slate-500 leading-relaxed border border-slate-200 bg-white p-3">
              Kullanılan sipariş alanları: Ürün Id, Mağaza Ürün Kodu, Adet,
              Barkod, Varyant Id, Varyant Kodu.
            </div>
          </div>

          <div className="border border-slate-200 bg-white min-w-0">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Sipariş Önizleme
              </div>
              <div className="text-xs text-slate-400">
                İlk 50 satır gösteriliyor
              </div>
            </div>

            <div className="max-h-[560px] overflow-y-auto scroll-area divide-y divide-slate-100">
              {rows.slice(0, 50).map((row) => (
                <div
                  key={row.order_row_id}
                  className="p-4 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 flex items-center justify-center border flex-shrink-0 ${
                      row.matched
                        ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                        : "bg-red-50 border-red-100 text-red-600"
                    }`}
                  >
                    {row.matched ? (
                      <CheckCircle size={20} weight="bold" />
                    ) : (
                      <WarningCircle size={20} weight="bold" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {row.stock_code || row.barcode || row.product_id || "-"}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      Adet: {row.quantity} · Barkod: {row.barcode || "-"} ·
                      Varyant ID: {row.variant_id || "-"}
                    </div>

                    <div className="text-xs mt-1 truncate">
                      {row.matched ? (
                        <span className="text-emerald-600">
                          Eşleşti:{" "}
                          {row.product?.product_name || row.product?.stock_code}
                        </span>
                      ) : (
                        <span className="text-red-600">
                          Ürün data içinde eşleşmedi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {rows.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Henüz sipariş Excel’i yüklenmedi.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}