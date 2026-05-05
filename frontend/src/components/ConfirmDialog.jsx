import { WarningCircle, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({
  open,
  title = "Emin misiniz?",
  message = "Bu işlem geri alınamaz.",
  confirmText = "Evet",
  cancelText = "Vazgeç",
  danger = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 flex items-center justify-center border ${
                danger
                  ? "bg-red-50 border-red-100 text-red-600"
                  : "bg-blue-50 border-blue-100 text-[#002FA7]"
              }`}
            >
              <WarningCircle size={22} weight="bold" />
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                {title}
              </h3>
              <p className="text-xs text-slate-500">
                Lütfen işlemi onaylayın.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-none border-slate-200"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            className={`rounded-none ${
              danger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-[#002FA7] hover:bg-[#00227A] text-white"
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}