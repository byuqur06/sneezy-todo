import { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Star,
  Sun,
  Calendar as CalIcon,
  ArrowsClockwise,
  Trash,
  NotePencil,
  Tag,
  CheckCircle,
  CaretLeft,
  CaretRight,
  ListBullets,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function TaskDetail({
  task,
  lists = [],
  onClose,
  onUpdate,
  onDelete,
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [newStep, setNewStep] = useState("");
  const [newTag, setNewTag] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const imageUrls = useMemo(() => {
    const urls = [];

    if (Array.isArray(task.image_urls)) {
      task.image_urls.forEach((url) => {
        if (url && !urls.includes(url)) urls.push(url);
      });
    }

    if (task.image_url && !urls.includes(task.image_url)) {
      urls.unshift(task.image_url);
    }

    return urls.filter(Boolean);
  }, [task.image_url, task.image_urls]);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || "");
    setActiveImageIndex(0);
  }, [task.task_id, task.title, task.notes]);

  const activeImage = imageUrls[activeImageIndex];

  const goPrevImage = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (imageUrls.length <= 1) return;

    setActiveImageIndex((current) => {
      if (current === 0) return imageUrls.length - 1;
      return current - 1;
    });
  };

  const goNextImage = (event) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (imageUrls.length <= 1) return;

    setActiveImageIndex((current) => {
      if (current === imageUrls.length - 1) return 0;
      return current + 1;
    });
  };

  const saveTitle = () => {
    if (title.trim() && title !== task.title) {
      onUpdate({ title: title.trim() });
    }
  };

  const saveNotes = () => {
    if (notes !== task.notes) {
      onUpdate({ notes });
    }
  };

  const addStep = (e) => {
    e.preventDefault();

    if (!newStep.trim()) return;

    const step = {
      id: `step_${Math.random().toString(36).slice(2, 10)}`,
      title: newStep.trim(),
      completed: false,
    };

    onUpdate({
      steps: [...(task.steps || []), step],
    });

    setNewStep("");
  };

  const toggleStep = (id) => {
    onUpdate({
      steps: (task.steps || []).map((step) =>
        step.id === id
          ? {
              ...step,
              completed: !step.completed,
            }
          : step
      ),
    });
  };

  const removeStep = (id) => {
    onUpdate({
      steps: (task.steps || []).filter((step) => step.id !== id),
    });
  };

  const addTag = (e) => {
    e.preventDefault();

    if (!newTag.trim()) return;

    onUpdate({
      tags: [...(task.tags || []), newTag.trim()],
    });

    setNewTag("");
  };

  const removeTag = (tag) => {
    onUpdate({
      tags: (task.tags || []).filter((item) => item !== tag),
    });
  };

  const currentList = lists.find((list) => list.list_id === task.list_id);

  return (
    <aside
      className="w-96 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col h-screen shadow-[-4px_0_24px_rgba(0,0,0,0.02)]"
      data-testid="task-detail"
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Görev Detayı
          </div>

          {currentList && (
            <div className="text-xs text-slate-400 mt-0.5">
              Liste: {currentList.name}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-none h-8 w-8"
          data-testid="task-detail-close"
        >
          <X size={18} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area px-5 py-5 space-y-5">
        {/* Title + complete + star */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => onUpdate({ completed: !task.completed })}
            className={`mt-1 w-5 h-5 flex-shrink-0 border flex items-center justify-center ${
              task.completed
                ? "bg-[#002FA7] border-[#002FA7]"
                : "border-slate-300"
            }`}
            data-testid="detail-complete-toggle"
          >
            {task.completed && (
              <CheckCircle size={14} weight="bold" className="text-white" />
            )}
          </button>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className={`border-0 px-0 py-0 rounded-none text-lg font-medium focus-visible:ring-0 shadow-none ${
              task.completed ? "task-strike" : ""
            }`}
            data-testid="detail-title-input"
          />

          <button
            onClick={() => onUpdate({ important: !task.important })}
            className="mt-1 text-slate-300 hover:text-amber-500"
            data-testid="detail-star"
          >
            <Star
              size={20}
              weight={task.important ? "fill" : "regular"}
              className={task.important ? "text-amber-500" : ""}
            />
          </button>
        </div>

        {/* Product info */}
        {(imageUrls.length > 0 ||
          task.product_name ||
          task.stock_code ||
          task.barcode ||
          task.quantity !== undefined) && (
          <div className="border border-slate-200 bg-slate-50">
            <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Ürün Bilgisi
              </div>

              {task.matched === false && (
                <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-1 font-semibold">
                  Eşleşmedi
                </span>
              )}
            </div>

            {imageUrls.length > 0 ? (
              <div className="relative bg-white border-b border-slate-200 select-none">
                <div className="w-full aspect-square overflow-hidden flex items-center justify-center">
                  <img
                    src={activeImage}
                    alt={task.product_name || task.title}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>

                {imageUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={goPrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 border border-slate-200 flex items-center justify-center hover:bg-slate-50 shadow-sm"
                      title="Önceki görsel"
                    >
                      <CaretLeft size={22} />
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={goNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 border border-slate-200 flex items-center justify-center hover:bg-slate-50 shadow-sm"
                      title="Sonraki görsel"
                    >
                      <CaretRight size={22} />
                    </button>

                    <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-xs px-2 py-1 z-20">
                      {activeImageIndex + 1} / {imageUrls.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full aspect-square bg-white border-b border-slate-200 flex items-center justify-center text-slate-300">
                <ImageIcon size={42} />
              </div>
            )}

            {imageUrls.length > 1 && (
              <div className="p-2 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white">
                {imageUrls.map((url, index) => (
                  <button
                    key={`${url}_${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-12 h-12 flex-shrink-0 border overflow-hidden ${
                      activeImageIndex === index
                        ? "border-[#002FA7] ring-1 ring-[#002FA7]"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`${task.product_name || task.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 space-y-3">
              {task.product_name && (
                <div>
                  <div className="text-xs text-slate-500">Ürün Adı</div>
                  <div className="text-sm font-semibold text-slate-900 leading-snug">
                    {task.product_name}
                  </div>
                </div>
              )}

              {task.stock_code && (
                <div>
                  <div className="text-xs text-slate-500">Stok Kodu</div>
                  <div className="text-sm font-mono text-slate-800 break-all bg-white border border-slate-200 px-2 py-1 mt-1">
                    {task.stock_code}
                  </div>
                </div>
              )}

              {task.barcode && (
                <div>
                  <div className="text-xs text-slate-500">Barkod</div>
                  <div className="text-sm font-mono text-slate-800 break-all bg-white border border-slate-200 px-2 py-1 mt-1">
                    {task.barcode}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {task.initial_quantity !== undefined && (
                  <div className="bg-white border border-slate-200 px-3 py-2">
                    <div className="text-xs text-slate-500">Başlangıç</div>
                    <div className="text-lg font-black text-slate-900">
                      {task.initial_quantity}
                    </div>
                  </div>
                )}

                {task.quantity !== undefined && (
                  <div className="bg-white border border-slate-200 px-3 py-2">
                    <div className="text-xs text-slate-500">Kalan</div>
                    <div className="text-lg font-black text-[#002FA7]">
                      {task.quantity}
                    </div>
                  </div>
                )}
              </div>

              {task.variant_name && (
                <div>
                  <div className="text-xs text-slate-500">Varyant</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {task.variant_name}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Move list */}
        <div className="border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            <ListBullets size={14} />
            Liste Değiştir
          </div>

          <select
            value={task.list_id || ""}
            onChange={(e) => onUpdate({ list_id: e.target.value })}
            className="w-full h-10 border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Liste Yok</option>
            {lists.map((list) => (
              <option key={list.list_id} value={list.list_id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {/* My Day */}
        <button
          onClick={() => onUpdate({ my_day: !task.my_day })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 border ${
            task.my_day
              ? "border-[#002FA7] bg-blue-50"
              : "border-slate-200 hover:bg-slate-50"
          } transition-colors`}
          data-testid="detail-myday"
        >
          <Sun
            size={18}
            weight={task.my_day ? "fill" : "regular"}
            className={task.my_day ? "text-[#0EA5E9]" : "text-slate-500"}
          />
          <span className="text-sm font-medium">
            {task.my_day ? "Bugünden kaldır" : "Bugüne ekle"}
          </span>
        </button>

        {/* Steps */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            <CheckCircle size={14} /> Adımlar
          </div>

          <div className="space-y-1.5">
            {(task.steps || []).map((step) => (
              <div
                key={step.id}
                className="group flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50"
              >
                <button
                  onClick={() => toggleStep(step.id)}
                  className={`w-4 h-4 border flex items-center justify-center ${
                    step.completed
                      ? "bg-[#002FA7] border-[#002FA7]"
                      : "border-slate-300"
                  }`}
                  data-testid={`step-toggle-${step.id}`}
                >
                  {step.completed && (
                    <CheckCircle
                      size={10}
                      weight="bold"
                      className="text-white"
                    />
                  )}
                </button>

                <span
                  className={`flex-1 text-sm ${
                    step.completed ? "task-strike" : "text-slate-800"
                  }`}
                >
                  {step.title}
                </span>

                <button
                  onClick={() => removeStep(step.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={addStep} className="flex items-center gap-2 mt-2">
            <Plus size={16} className="text-slate-400" />
            <Input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Sonraki adım"
              className="border-0 px-0 py-1 rounded-none focus-visible:ring-0 shadow-none text-sm"
              data-testid="detail-new-step"
            />
          </form>
        </div>

        {/* Due date */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Tarih & Tekrar
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start rounded-none"
                data-testid="detail-due-date"
              >
                <CalIcon size={16} className="mr-2" />
                {task.due_date
                  ? format(new Date(task.due_date), "d MMMM yyyy", {
                      locale: tr,
                    })
                  : "Bitiş tarihi ekle"}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0 rounded-none" align="start">
              <Calendar
                mode="single"
                selected={task.due_date ? new Date(task.due_date) : undefined}
                onSelect={(date) =>
                  onUpdate({ due_date: date ? date.toISOString() : null })
                }
                locale={tr}
              />

              {task.due_date && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate({ due_date: null })}
                    className="w-full rounded-none text-red-600"
                  >
                    Tarihi kaldır
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Select
            value={task.recurrence || "none"}
            onValueChange={(value) => onUpdate({ recurrence: value })}
          >
            <SelectTrigger className="rounded-none" data-testid="detail-recurrence">
              <ArrowsClockwise size={16} className="mr-2" />
              <SelectValue />
            </SelectTrigger>

            <SelectContent className="rounded-none">
              <SelectItem value="none">Tekrar yok</SelectItem>
              <SelectItem value="daily">Her gün</SelectItem>
              <SelectItem value="weekly">Her hafta</SelectItem>
              <SelectItem value="monthly">Her ay</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            <Tag size={14} /> Etiketler
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {(task.tags || []).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-none cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag} <X size={12} className="ml-1" />
              </Badge>
            ))}
          </div>

          <form onSubmit={addTag}>
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Etiket ekle ve Enter'a bas"
              className="rounded-none h-9 text-sm"
              data-testid="detail-new-tag"
            />
          </form>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            <NotePencil size={14} /> Notlar
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Not ekle..."
            rows={4}
            className="rounded-none resize-none"
            data-testid="detail-notes"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Oluşturuldu:{" "}
          {task.created_at
            ? format(new Date(task.created_at), "d MMM", { locale: tr })
            : "-"}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="rounded-none text-red-600 hover:bg-red-50"
          data-testid="detail-delete"
        >
          <Trash size={16} className="mr-2" /> Sil
        </Button>
      </div>
    </aside>
  );
}