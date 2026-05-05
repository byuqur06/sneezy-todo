import { useState } from "react";
import {
  Sun, Star, Calendar, ListBullets, House, CheckCircle, MagnifyingGlass,
  Plus, SignOut, Sparkle, DotsThree, Trash, Palette
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SMART_LISTS = [
  { id: "today", name: "Bugün", icon: Sun, color: "#0EA5E9" },
  { id: "important", name: "Önemli", icon: Star, color: "#F59E0B" },
  { id: "planned", name: "Planlandı", icon: Calendar, color: "#DC2626" },
  { id: "all", name: "Tümü", icon: ListBullets, color: "#52525B" },
  { id: "completed", name: "Tamamlandı", icon: CheckCircle, color: "#16A34A" },
];

export default function Sidebar({
  user, lists, tasks, activeView, setActiveView,
  onCreateList, onUpdateList, onDeleteList, onLogout, searchQ, setSearchQ, onOpenAI
}) {
  const [newListName, setNewListName] = useState("");
  const [newListBg, setNewListBg] = useState("none");
  const [dialogOpen, setDialogOpen] = useState(false);

  const submitNewList = (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim(), newListBg);
    setNewListName(""); setNewListBg("none"); setDialogOpen(false);
  };

  const countSmart = (id) => {
    if (id === "today") return tasks.filter(t => t.my_day && !t.completed).length;
    if (id === "important") return tasks.filter(t => t.important && !t.completed).length;
    if (id === "planned") return tasks.filter(t => t.due_date && !t.completed).length;
    if (id === "all") return tasks.filter(t => !t.completed).length;
    if (id === "completed") return tasks.filter(t => t.completed).length;
    return 0;
  };

  const isActive = (type, id) => activeView.type === type && activeView.id === id;

  return (
    <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white hidden md:flex flex-col h-screen" data-testid="sidebar">
      {/* User */}
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <Avatar className="w-10 h-10 rounded-none border border-slate-200">
          <AvatarImage src={user?.picture} />
          <AvatarFallback className="rounded-none bg-[#002FA7] text-white text-sm font-bold">
            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-sm truncate" data-testid="sidebar-user-name">{user?.name || "Kullanıcı"}</div>
          <div className="text-xs text-slate-500 truncate">{user?.email}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-none h-8 w-8" data-testid="sidebar-user-menu">
              <DotsThree size={20} weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-none">
            <DropdownMenuItem onClick={onOpenAI} data-testid="sidebar-ai-menu">
              <Sparkle size={16} className="mr-2" /> AI Asistan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600" data-testid="sidebar-logout">
              <SignOut size={16} className="mr-2" /> Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Ara..."
            className="pl-9 h-9 rounded-none border-slate-200"
            data-testid="sidebar-search"
          />
        </div>
      </div>

      {/* Smart lists */}
      <nav className="flex-1 overflow-y-auto scroll-area px-2 py-3">
        <div className="space-y-0.5">
          {SMART_LISTS.map(s => {
            const Icon = s.icon;
            const count = countSmart(s.id);
            const active = isActive("smart", s.id);
            return (
              <button
                key={s.id}
                onClick={() => setActiveView({ type: "smart", id: s.id })}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
                data-testid={`smart-list-${s.id}`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} style={{ color: s.color }} />
                <span className={`flex-1 text-sm ${active ? "font-semibold" : "font-medium"} text-slate-800`}>{s.name}</span>
                {count > 0 && <span className="text-xs text-slate-500 tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Custom lists */}
        <div className="mt-6 px-3">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Listelerim</div>
        </div>
        <div className="space-y-0.5">
          {lists.map(l => {
            const active = isActive("list", l.list_id);
            const taskCount = tasks.filter(t => t.list_id === l.list_id && !t.completed).length;
            return (
              <div
                key={l.list_id}
                className={`group flex items-center gap-2 px-3 py-2 transition-colors ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                <button
                  onClick={() => setActiveView({ type: "list", id: l.list_id })}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  data-testid={`list-${l.list_id}`}
                >
                  <House size={18} style={{ color: l.color }} />
                  <span className={`flex-1 text-sm truncate ${active ? "font-semibold" : "font-medium"} text-slate-800`}>{l.name}</span>
                  {taskCount > 0 && <span className="text-xs text-slate-500 tabular-nums">{taskCount}</span>}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700" data-testid={`list-menu-${l.list_id}`}>
                      <DotsThree size={18} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-none">
                    <DropdownMenuItem onClick={() => onUpdateList(l.list_id, { theme_bg: l.theme_bg === "none" ? "pastel" : l.theme_bg === "pastel" ? "nature" : l.theme_bg === "nature" ? "blur" : "none" })}>
                      <Palette size={16} className="mr-2" /> Temayı Değiştir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDeleteList(l.list_id)} className="text-red-600">
                      <Trash size={16} className="mr-2" /> Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-slate-200 p-2 space-y-1">
        <Button
          onClick={onOpenAI}
          variant="ghost"
          className="w-full justify-start rounded-none ai-glow"
          data-testid="sidebar-open-ai"
        >
          <Sparkle size={16} weight="fill" className="mr-2 text-[#002FA7]" />
          <span className="text-sm font-medium">AI Asistan</span>
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start rounded-none hover:bg-slate-50" data-testid="sidebar-new-list">
              <Plus size={18} className="mr-2" />
              <span className="text-sm font-medium">Yeni Liste</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-none">
            <DialogHeader>
              <DialogTitle className="font-display">Yeni Liste Oluştur</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitNewList} className="space-y-4">
              <div>
                <Label htmlFor="list-name">Liste Adı</Label>
                <Input
                  id="list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Örn. Alışveriş, İş, Kişisel..."
                  className="rounded-none mt-1.5"
                  autoFocus
                  data-testid="new-list-name"
                />
              </div>
              <div>
                <Label>Tema</Label>
                <Select value={newListBg} onValueChange={setNewListBg}>
                  <SelectTrigger className="rounded-none mt-1.5" data-testid="new-list-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="none">Sade</SelectItem>
                    <SelectItem value="pastel">Pastel Dalgalar</SelectItem>
                    <SelectItem value="nature">Sisli Dağlar</SelectItem>
                    <SelectItem value="blur">Bulanık Mavi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-[#002FA7] hover:bg-[#00227A] rounded-none" data-testid="new-list-submit">Oluştur</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}
