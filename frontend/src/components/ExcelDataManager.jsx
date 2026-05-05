import { useEffect, useState } from "react";
import { X, UploadSimple, Trash, Database, Images } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  parseProductExcelFile,
  saveProductData,
  getProductData,
  getProductDataStats,
  clearProductData,
} from "@/lib/excelProducts";
import { toast } from "sonner";

export default function ExcelDataManager({ onClose }) {
  const [products, setProducts] = useState([]);
  const [productStats, setProductStats] = useState({
    count: 0,
    updated_at: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingSavedData, setLoadingSavedData] = useState(true);

  const loadSavedProducts = async () => {
    setLoadingSavedData(true);

    try {
      const [savedProducts, stats] = await Promise.all([
        getProductData(),
        getProductDataStats(),
      ]);

      setProducts(Array.isArray(savedProducts) ? savedProducts : []);
      setProductStats(stats || { count: 0, updated_at: "" });
    } catch {
      setProducts([]);
      setProductStats({ count: 0, updated_at: "" });
      toast.error("Kayıtlı ürün datası okunamadı");
    } finally {
      setLoadingSavedData(false);
    }
  };

  useEffect(() => {
    loadSavedProducts();
  }, []);

  const handleExcelFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);

    try {
      const parsedProducts = await parseProductExcelFile(file);

      const result = await saveProductData(parsedProducts);

      setProducts(parsedProducts.slice(0, 100));
      setProductStats({
        count: result?.count || parsedProducts.length,
        updated_at: result?.updated_at || "",
      });

      toast.success(`${parsedProducts.length} ürün/varyant backend'e aktarıldı`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Excel dosyası okunamadı");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleClear = async () => {
    if (!confirm("Ürün data kayıtlarını temizlemek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      await clearProductData();
      setProducts([]);
      setProductStats({
        count: 0,
        updated_at: "",
      });
      toast.success("Ürün data kayıtları temizlendi");
    } catch (error) {
      toast.error(error.message || "Ürün data kayıtları temizlenemedi");
    }
  };

  const visibleCount = productStats.count || products.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 flex justify-center">
      <div className="w-full max-w-6xl max-h-[92vh] bg-white border border-slate-200 shadow-[0_30px_100px_rgba(15,23,42,0.28)] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#002FA7] mb-1">
              Sneezy Data
            </div>
            <h2 className="font-display text-2xl font-black tracking-tight text-slate-900">
              Ürün Data Excel
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Entegra ürün/varyant Excel’ini yükleyin. Siparişler bu data ile eşleştirilecek.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-none border border-slate-200 hover:bg-slate-50"
          >
            <X size={22} />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={20} className="text-[#002FA7]" />
              <div className="font-semibold text-slate-900">
                Ürün Havuzu
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-5">
              Backend’de kayıtlı ürün/varyant sayısı:
              <div className="text-3xl font-black text-slate-900 mt-2">
                {loadingSavedData ? "..." : visibleCount.toLocaleString("tr-TR")}
              </div>

              {productStats.updated_at && (
                <div className="text-xs text-slate-500 mt-2">
                  Son yükleme: {productStats.updated_at}
                </div>
              )}
            </div>

            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFile}
                className="hidden"
                disabled={loading}
              />

              <div className="w-full h-12 bg-[#002FA7] hover:bg-[#00227A] text-white flex items-center justify-center font-semibold">
                <UploadSimple size={18} className="mr-2" />
                {loading ? "Yükleniyor..." : "Ürün Data Excel Yükle"}
              </div>
            </label>

            {visibleCount > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="w-full mt-3 rounded-none border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash size={18} className="mr-2" />
                Data Kayıtlarını Temizle
              </Button>
            )}

            <div className="mt-5 text-xs text-slate-500 leading-relaxed border border-slate-200 bg-white p-3">
              Kullanılan alanlar: Urun-Kodu, Seçenek-Ürün-Kodu, Barcode,
              Secenek-Barcode, UrunAdi, Ürün Adedi, ImageURL1-5.
            </div>
          </div>

          <div className="border border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Örnek Kayıtlar
              </div>
              <div className="text-xs text-slate-400">
                İlk 100 kayıt önizleme olarak gösteriliyor
              </div>
            </div>

            <div className="max-h-[560px] overflow-y-auto scroll-area divide-y divide-slate-100">
              {products.slice(0, 100).map((product) => (
                <div key={product.id} className="p-4 flex items-center gap-3">
                  <div className="w-14 h-14 border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name || product.stock_code || "Ürün"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Images size={22} className="text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {product.stock_code || "-"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {product.product_name || "Ürün adı yok"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Barkod: {product.barcode || "-"} · Adet: {product.stock_quantity || 0}
                    </div>
                  </div>
                </div>
              ))}

              {!loadingSavedData && products.length === 0 && visibleCount === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Henüz ürün data Excel’i yüklenmedi.
                </div>
              )}

              {!loadingSavedData && products.length === 0 && visibleCount > 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Backend’de ürün datası var. Yeni data yüklediğinizde önizleme burada görünür.
                </div>
              )}

              {loadingSavedData && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Kayıtlı ürün datası yükleniyor...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}