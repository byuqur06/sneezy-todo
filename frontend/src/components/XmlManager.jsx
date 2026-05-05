import { useState } from "react";
import { X, UploadSimple, Trash, Database } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  parseXmlProducts,
  saveXmlProducts,
  getXmlProducts,
  clearXmlProducts,
} from "@/lib/xmlProducts";
import { toast } from "sonner";

export default function XmlManager({ onClose }) {
  const [products, setProducts] = useState(() => getXmlProducts());
  const [loading, setLoading] = useState(false);

  const handleXmlFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);

    try {
      const text = await file.text();
      const parsedProducts = parseXmlProducts(text);

      saveXmlProducts(parsedProducts);
      setProducts(parsedProducts);

      toast.success(`${parsedProducts.length} ürün XML'den aktarıldı`);
    } catch (error) {
      toast.error(error.message || "XML okunamadı");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleClear = () => {
    clearXmlProducts();
    setProducts([]);
    toast.success("XML ürünleri temizlendi");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 flex justify-center">
      <div className="w-full max-w-6xl max-h-[92vh] bg-white border border-slate-200 shadow-[0_30px_100px_rgba(15,23,42,0.28)] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#002FA7] mb-1">
              Sneezy XML
            </div>
            <h2 className="font-display text-2xl font-black tracking-tight text-slate-900">
              XML Ürün Eşleştirme
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              XML dosyasını yükleyin. Barkod veya stok kodu ile görevlere ürün bilgisi eşleştirilecek.
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
                XML Verisi
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-5">
              Şu an kayıtlı ürün sayısı:
              <div className="text-3xl font-black text-slate-900 mt-2">
                {products.length}
              </div>
            </div>

            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept=".xml,text/xml"
                onChange={handleXmlFile}
                className="hidden"
              />

              <div className="w-full h-12 bg-[#002FA7] hover:bg-[#00227A] text-white flex items-center justify-center font-semibold">
                <UploadSimple size={18} className="mr-2" />
                {loading ? "Yükleniyor..." : "XML Dosyası Yükle"}
              </div>
            </label>

            {products.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="w-full mt-3 rounded-none border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash size={18} className="mr-2" />
                XML Verisini Temizle
              </Button>
            )}
          </div>

          <div className="border border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Örnek Ürünler
              </div>
              <div className="text-xs text-slate-400">
                İlk 20 kayıt gösteriliyor
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto scroll-area divide-y divide-slate-100">
              {products.slice(0, 20).map((product) => (
                <div key={product.id} className="p-4 flex items-center gap-3">
                  <div className="w-14 h-14 border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name || product.stock_code || "Ürün"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Database size={22} className="text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-900 truncate">
                      {product.name || "Ürün adı yok"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Stok Kodu: {product.stock_code || "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Barkod: {product.barcode || "-"}
                    </div>
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Henüz XML ürünü yüklenmedi.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}