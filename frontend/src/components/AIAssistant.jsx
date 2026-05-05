import { useState } from "react";
import { Sparkle, X, MagicWand, Lightning, ListChecks, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AIAssistant({ onClose, activeListId, onTaskCreated }) {
  const [mode, setMode] = useState("parse"); // parse | suggest | plan
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [plan, setPlan] = useState("");

  const submit = async () => {
    if (mode !== "plan" && !prompt.trim()) return;
    setLoading(true);
    setSuggestions([]); setPlan("");
    try {
      if (mode === "parse") {
        const res = await api.post("/ai/parse", { prompt: prompt.trim(), list_id: activeListId });
        onTaskCreated(res.data);
        toast.success("Görev oluşturuldu");
        setPrompt("");
      } else if (mode === "suggest") {
        const res = await api.post("/ai/suggest", { prompt: prompt.trim() });
        setSuggestions(res.data.suggestions || []);
      } else if (mode === "plan") {
        const res = await api.post("/ai/plan-day");
        setPlan(res.data.plan || "");
      }
    } catch (e) {
      toast.error("AI isteği başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  const addSuggestion = async (s) => {
    try {
      const res = await api.post("/tasks", { title: s.title, notes: s.notes || "", list_id: activeListId });
      onTaskCreated(res.data);
      toast.success("Eklendi");
    } catch { toast.error("Eklenemedi"); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose} data-testid="ai-assistant-modal">
      <div
        className="w-full sm:max-w-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between ai-glow">
          <div className="flex items-center gap-3">
            <Sparkle size={22} weight="fill" className="text-[#002FA7]" />
            <div>
              <div className="font-display font-bold text-lg leading-tight">AI Asistan</div>
              <div className="text-xs text-slate-500">Claude Sonnet 4.5</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-none" data-testid="ai-close">
            <X size={20} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {[
            { id: "parse", label: "Görev Oluştur", icon: MagicWand },
            { id: "suggest", label: "Öneri Al", icon: Lightning },
            { id: "plan", label: "Günümü Planla", icon: ListChecks },
          ].map(t => {
            const Ic = t.icon;
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setMode(t.id); setSuggestions([]); setPlan(""); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-[#002FA7] text-[#002FA7] bg-blue-50/40" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
                data-testid={`ai-tab-${t.id}`}
              >
                <Ic size={16} weight={active ? "fill" : "regular"} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto scroll-area p-6 space-y-4">
          {mode === "parse" && (
            <>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Doğal Dilde Görev</div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Örn: Yarın 14:00'te dişçi randevumu hatırlat, önemli olarak işaretle"
                  rows={3}
                  className="rounded-none"
                  data-testid="ai-parse-input"
                />
              </div>
              <div className="text-xs text-slate-500">
                AI sizin için başlık, tarih, önem, tekrar ve adımları otomatik çıkaracak.
              </div>
            </>
          )}
          {mode === "suggest" && (
            <>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Hedefiniz Nedir?</div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Örn: Bu hafta yeni bir blog yazısı yayınlamak istiyorum"
                  rows={3}
                  className="rounded-none"
                  data-testid="ai-suggest-input"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Önerilen Görevler</div>
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-slate-200 hover:bg-slate-50">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{s.title}</div>
                        {s.notes && <div className="text-xs text-slate-500 mt-1">{s.notes}</div>}
                      </div>
                      <Button size="sm" variant="outline" className="rounded-none" onClick={() => addSuggestion(s)} data-testid={`ai-add-suggestion-${i}`}>
                        Ekle <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {mode === "plan" && (
            <>
              <div className="text-sm text-slate-700">
                Bekleyen görevlerinize bakarak öncelikli bir günlük plan oluştururum.
              </div>
              {plan && (
                <div className="p-4 border border-slate-200 bg-slate-50 whitespace-pre-wrap text-sm leading-relaxed font-medium text-slate-800">
                  {plan}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-none" data-testid="ai-cancel">İptal</Button>
          <Button onClick={submit} disabled={loading} className="bg-[#002FA7] hover:bg-[#00227A] rounded-none" data-testid="ai-submit">
            {loading ? "İşleniyor..." : (mode === "plan" ? "Planı Oluştur" : "Gönder")}
          </Button>
        </div>
      </div>
    </div>
  );
}
