import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Star,
  Sun,
  ListBullets,
  Calendar,
  CheckCircle,
  Sparkle,
  House,
  Trash,
  Barcode,
  Images,
  ArrowRight,
  X,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  findProductFromData,
  searchProductsFromData,
} from "@/lib/excelProducts";

const SMART_META = {
  today: { name: "Bugün", icon: Sun, color: "#0EA5E9" },
  important: { name: "Önemli", icon: Star, color: "#F59E0B" },
  planned: { name: "Planlandı", icon: Calendar, color: "#DC2626" },
  all: { name: "Tümü", icon: ListBullets, color: "#52525B" },
  completed: { name: "Tamamlandı", icon: CheckCircle, color: "#16A34A" },
  unmatched: { name: "Eşleşmeyenler", icon: Sparkle, color: "#DC2626" },
};

function TaskRow({
  task,
  lists = [],
  onSelect,
  onToggle,
  onToggleStar,
  onDelete,
  onUpdateQuantity,
  onMoveToList,
  isSelected,
}) {
  const [pointerStart, setPointerStart] = useState(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [listPickerOpen, setListPickerOpen] = useState(false);

  const dueLabel = task.due_date
    ? format(new Date(task.due_date), "d MMM", { locale: tr })
    : null;

  const isProductTask = Boolean(task.stock_code || task.barcode || task.image_url);

  const shouldShowTitle =
    !isProductTask ||
    (task.title &&
      task.title !== task.stock_code &&
      task.title !== task.barcode &&
      task.title !== task.match_code);

  const handlePointerDown = (event) => {
    if (event.target.closest("button") || event.target.closest("input")) return;

    setPointerStart({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handlePointerUp = (event) => {
    if (!pointerStart) return;

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;

    setPointerStart(null);

    if (Math.abs(dy) > 45) return;

    if (dx > 70) {
      setMoveOpen(true);
      setListPickerOpen(false);
      return;
    }

    if (dx < -45) {
      setMoveOpen(false);
      setListPickerOpen(false);
    }
  };

  const handleMoveToList = (listId) => {
    onMoveToList(listId);
    setMoveOpen(false);
    setListPickerOpen(false);
  };

  return (
    <div className="relative">
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={() => onSelect(task.task_id)}
        className={`group flex items-center gap-3 px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${
          isSelected ? "bg-slate-50" : "hover:bg-slate-50"
        } glass-row`}
        data-testid={`task-row-${task.task_id}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`w-5 h-5 flex-shrink-0 border flex items-center justify-center transition-colors ${
            task.completed
              ? "bg-[#002FA7] border-[#002FA7]"
              : "border-slate-300 hover:border-[#002FA7]"
          }`}
          data-testid={`task-checkbox-${task.task_id}`}
        >
          {task.completed && (
            <CheckCircle size={14} weight="bold" className="text-white" />
          )}
        </button>

        {task.image_url && (
          <div className="w-12 h-12 flex-shrink-0 border border-slate-200 bg-white overflow-hidden">
            <img
              src={task.image_url}
              alt={task.product_name || task.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {shouldShowTitle && (
            <div
              className={`text-sm ${
                task.completed ? "task-strike" : "text-slate-900 font-medium"
              }`}
            >
              {task.title}
            </div>
          )}

          {(task.stock_code ||
            task.barcode ||
            task.quantity ||
            task.matched === false) && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {task.stock_code && (
                <span className="inline-flex items-center border border-slate-300 bg-slate-50 px-2.5 py-1 text-[13px] font-black tracking-tight text-slate-900">
                  STOK: {task.stock_code}
                </span>
              )}

              {task.quantity !== undefined && task.quantity !== null && (
                <div
                  className="inline-flex items-center overflow-hidden border border-[#002FA7] bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const nextQuantity = Math.max(
                        0,
                        Number(task.quantity || 0) - 1
                      );
                      onUpdateQuantity(nextQuantity);

                      if (nextQuantity === 0 && !task.completed) {
                        onToggle();
                      }
                    }}
                    className="px-2 py-1 text-[13px] font-black text-[#002FA7] hover:bg-blue-50"
                    title="Adeti azalt"
                  >
                    -
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextQuantity = Number(task.quantity || 0) + 1;
                      onUpdateQuantity(nextQuantity);
                    }}
                    className="px-2.5 py-1 text-[13px] font-black bg-[#002FA7] text-white"
                    title="Adeti artır"
                  >
                    ADET: {task.quantity}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextQuantity = Number(task.quantity || 0) + 1;
                      onUpdateQuantity(nextQuantity);
                    }}
                    className="px-2 py-1 text-[13px] font-black text-[#002FA7] hover:bg-blue-50"
                    title="Adeti artır"
                  >
                    +
                  </button>
                </div>
              )}

              {task.barcode && (
                <span className="inline-flex items-center text-xs font-medium text-slate-500">
                  Barkod: {task.barcode}
                </span>
              )}

              {task.matched === false && (
                <span className="inline-flex items-center border border-red-100 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                  Excel eşleşmedi
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            {task.steps?.length > 0 && (
              <span>
                {task.steps.filter((s) => s.completed).length}/{task.steps.length} adım
              </span>
            )}

            {dueLabel && (
              <>
                {task.steps?.length > 0 && <span>·</span>}
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {dueLabel}
                </span>
              </>
            )}

            {task.recurrence && task.recurrence !== "none" && (
              <>
                <span>·</span>
                <span>Tekrar</span>
              </>
            )}

            {task.notes && (
              <>
                <span>·</span>
                <span className="truncate max-w-[200px]">
                  {task.notes.slice(0, 60)}
                </span>
              </>
            )}
          </div>
        </div>

        {moveOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setListPickerOpen((current) => !current);
            }}
            className="flex items-center gap-1 bg-[#002FA7] text-white px-3 py-1.5 text-xs font-bold"
            title="Başka listeye taşı"
          >
            <ArrowRight size={14} />
            Taşı
          </button>
        )}

        {moveOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMoveOpen(false);
              setListPickerOpen(false);
            }}
            className="text-slate-400 hover:text-slate-700"
            title="Taşıma menüsünü kapat"
          >
            <X size={16} />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className="text-slate-300 hover:text-amber-500 transition-colors"
          data-testid={`task-star-${task.task_id}`}
        >
          <Star
            size={18}
            weight={task.important ? "fill" : "regular"}
            className={task.important ? "text-amber-500" : ""}
          />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 transition-all"
          data-testid={`task-delete-${task.task_id}`}
          title="Görevi sil"
        >
          <Trash size={18} />
        </button>
      </div>

      {listPickerOpen && (
        <div className="mx-4 mb-2 border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          <div className="px-3 py-2 border-b border-slate-100 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Taşınacak Listeyi Seç
          </div>

          <div className="max-h-56 overflow-y-auto scroll-area">
            {lists.map((list) => (
              <button
                key={list.list_id}
                type="button"
                onClick={() => handleMoveToList(list.list_id)}
                disabled={list.list_id === task.list_id}
                className={`w-full px-3 py-2 text-left text-sm border-b border-slate-100 last:border-b-0 ${
                  list.list_id === task.list_id
                    ? "text-slate-300 bg-slate-50 cursor-not-allowed"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {list.name}
                {list.list_id === task.list_id && "  • mevcut liste"}
              </button>
            ))}

            {lists.length === 0 && (
              <div className="px-3 py-3 text-sm text-slate-500">
                Henüz liste yok.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskList({
  view,
  list,
  lists = [],
  tasks,
  bg,
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onDeleteCompletedTasks,
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");

  const [matchedProduct, setMatchedProduct] = useState(null);
  const [matchingProduct, setMatchingProduct] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let active = true;

    const matchProduct = async () => {
      const code = newCode.trim();

      if (!code) {
        setMatchedProduct(null);
        setProductSuggestions([]);
        setSelectedProduct(null);
        setMatchingProduct(false);
        return;
      }

      setMatchingProduct(true);

      try {
        const suggestions = await searchProductsFromData(code, 12);

        if (!active) return;

        setProductSuggestions(suggestions);

        const exactProduct = await findProductFromData({
          stockCode: code,
          barcode: code,
          productId: "",
          variantId: "",
        });

        setMatchedProduct(exactProduct || suggestions[0] || null);
      } catch {
        if (active) {
          setMatchedProduct(null);
          setProductSuggestions([]);
        }
      } finally {
        if (active) {
          setMatchingProduct(false);
        }
      }
    };

    matchProduct();

    return () => {
      active = false;
    };
  }, [newCode]);

  const meta = useMemo(() => {
    if (view.type === "smart") return SMART_META[view.id];

    return {
      name: list?.name || "Liste",
      icon: House,
      color: list?.color || "#002FA7",
    };
  }, [view, list]);

  const Icon = meta?.icon || ListBullets;

  const bgClass = useMemo(() => {
    if (bg === "pastel") return "bg-theme-pastel";
    if (bg === "nature") return "bg-theme-nature";
    if (bg === "blur") return "bg-theme-blur";
    return "";
  }, [bg]);

  const todayLabel = format(new Date(), "EEEE, d MMMM", { locale: tr });

  const finalMatchedProduct = selectedProduct || matchedProduct;

  const showSuggestions =
    newCode.trim().length >= 2 &&
    productSuggestions.length > 0 &&
    !selectedProduct;

  const selectSuggestion = (product) => {
    setSelectedProduct(product);
    setMatchedProduct(product);
    setNewCode(product.stock_code || product.barcode || "");
    setProductSuggestions([]);
  };

  const submit = (e) => {
    e.preventDefault();

    const title = newTitle.trim();
    const code = newCode.trim();

    if (!title && !code) return;

    const product = finalMatchedProduct;
    const quantityNumber = Number(newQuantity) > 0 ? Number(newQuantity) : 1;
    const imageUrls = product?.image_urls || [];

    onCreateTask({
      title: title || product?.stock_code || product?.barcode || code,
      barcode: product?.barcode || code || "",
      stock_code: product?.stock_code || code || "",
      quantity: quantityNumber,
      initial_quantity: quantityNumber,

      product_name: product?.product_name || "",
      variant_name: product?.variant_name || "",
      variant_id: product?.variant_id || "",
      product_id: product?.product_id || "",

      image_url: product?.image_url || imageUrls[0] || "",
      image_urls: imageUrls,

      matched: code ? Boolean(product) : null,
      match_code: code,
      source: "manual_excel",
    });

    setNewTitle("");
    setNewCode("");
    setNewQuantity("1");
    setMatchedProduct(null);
    setSelectedProduct(null);
    setProductSuggestions([]);
  };

  const incomplete = tasks.filter((t) => !t.completed);
  const complete = tasks.filter((t) => t.completed);

  return (
    <main
      className={`flex-1 flex flex-col h-screen relative overflow-hidden ${bgClass}`}
      data-testid="task-list-pane"
    >
      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 pb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Icon size={26} weight="fill" style={{ color: meta?.color }} />
            <h1
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              data-testid="task-list-title"
            >
              {meta?.name}
            </h1>
          </div>

          {view.type === "smart" && view.id === "today" && (
            <div className="text-sm text-slate-600 mt-1 capitalize">
              {todayLabel}
            </div>
          )}
        </div>
      </header>

      {/* New task */}
      {view.id !== "completed" && (
        <form onSubmit={submit} className="px-6 sm:px-10 pb-3">
          <div className="bg-white border border-slate-200 focus-within:border-[#002FA7] transition-colors relative">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Plus size={20} className="text-[#002FA7]" />

              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Görev ekle..."
                className="border-0 px-0 py-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base shadow-none"
                data-testid="new-task-input"
              />

              {(newTitle || newCode) && (
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#002FA7] hover:bg-[#00227A] rounded-none h-8"
                  data-testid="new-task-submit"
                >
                  Ekle
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_100px] gap-3 px-4 py-3 bg-slate-50">
              <div className="relative">
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3">
                  <Barcode size={17} className="text-slate-400" />
                  <Input
                    value={newCode}
                    onChange={(e) => {
                      setNewCode(e.target.value);
                      setSelectedProduct(null);
                    }}
                    placeholder="Stok kodu, barkod veya ürün parçası ara..."
                    className="border-0 bg-transparent px-0 rounded-none focus-visible:ring-0 shadow-none h-9 text-sm"
                    data-testid="new-task-code-input"
                  />
                </div>

                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-[42px] z-40 bg-white border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.15)] max-h-80 overflow-y-auto">
                    {productSuggestions.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => selectSuggestion(product)}
                        className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="w-10 h-10 flex-shrink-0 border border-slate-200 bg-slate-50 overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.product_name || product.stock_code}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Images
                              size={18}
                              className="text-slate-300 m-2.5"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-slate-900 truncate">
                            {product.stock_code || "-"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {product.product_name || "Ürün adı yok"}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            Barkod: {product.barcode || "-"} · Varyant:{" "}
                            {product.variant_name || "-"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="Adet"
                className="rounded-none h-9 text-sm"
                data-testid="new-task-quantity-input"
              />
            </div>

            {newCode && (
              <div className="px-4 py-3 border-t border-slate-100 bg-white">
                {matchingProduct ? (
                  <div className="text-sm text-slate-500">
                    Ürün datası içinde aranıyor...
                  </div>
                ) : finalMatchedProduct ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-slate-200 bg-slate-50 overflow-hidden">
                      {finalMatchedProduct.image_url ? (
                        <img
                          src={finalMatchedProduct.image_url}
                          alt={
                            finalMatchedProduct.product_name ||
                            finalMatchedProduct.stock_code
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Barcode size={22} className="text-slate-300 m-3" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        Excel eşleşti: {finalMatchedProduct.stock_code || "-"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {finalMatchedProduct.product_name || "Ürün adı yok"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Barkod: {finalMatchedProduct.barcode || "-"} · Varyant:{" "}
                        {finalMatchedProduct.variant_name || "-"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    Excel ürün datasında eşleşen ürün bulunamadı. Görev yine de
                    eşleşmemiş olarak eklenebilir.
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto scroll-area">
        {incomplete.length === 0 && complete.length === 0 && (
          <div className="text-center py-20 px-6">
            <Sparkle
              size={48}
              weight="duotone"
              className="text-slate-300 mx-auto mb-4"
            />
            <p className="text-slate-500 font-medium">Henüz görev yok.</p>
            <p className="text-slate-400 text-sm mt-1">
              Yukarıdan yeni bir görev ekleyin.
            </p>
          </div>
        )}

        <div className="border-t border-slate-200 bg-white/0">
          {incomplete.map((t) => (
            <TaskRow
              key={t.task_id}
              task={t}
              lists={lists}
              isSelected={selectedTaskId === t.task_id}
              onSelect={onSelectTask}
              onToggle={() => onUpdateTask(t.task_id, { completed: true })}
              onToggleStar={() =>
                onUpdateTask(t.task_id, { important: !t.important })
              }
              onUpdateQuantity={(quantity) =>
                onUpdateTask(t.task_id, { quantity })
              }
              onMoveToList={(listId) =>
                onUpdateTask(t.task_id, { list_id: listId })
              }
              onDelete={() => onDeleteTask(t.task_id)}
            />
          ))}
        </div>

        {complete.length > 0 && (
          <details className="mt-6 px-6 sm:px-10 pb-10" open>
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center justify-between">
              <span>Tamamlandı ({complete.length})</span>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteCompletedTasks();
                }}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 normal-case tracking-normal font-medium"
                title="Tamamlananları sil"
              >
                <Trash size={14} />
                Tamamlananları Sil
              </button>
            </summary>

            <div className="border-t border-slate-200 mt-2 bg-white/0">
              {complete.map((t) => (
                <TaskRow
                  key={t.task_id}
                  task={t}
                  lists={lists}
                  isSelected={selectedTaskId === t.task_id}
                  onSelect={onSelectTask}
                  onToggle={() =>
                    onUpdateTask(t.task_id, { completed: false })
                  }
                  onToggleStar={() =>
                    onUpdateTask(t.task_id, { important: !t.important })
                  }
                  onUpdateQuantity={(quantity) =>
                    onUpdateTask(t.task_id, { quantity })
                  }
                  onMoveToList={(listId) =>
                    onUpdateTask(t.task_id, { list_id: listId })
                  }
                  onDelete={() => onDeleteTask(t.task_id)}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}