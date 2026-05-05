import { useMemo, useState } from "react";
import {
  Sun,
  Star,
  Calendar,
  ListBullets,
  House,
  CheckCircle,
  MagnifyingGlass,
  Plus,
  SignOut,
  Sparkle,
  DotsThree,
  Trash,
  Users,
  Moon,
  Barcode,
  PencilSimple,
  ArrowsDownUp,
  ArrowUp,
  ArrowDown,
  WarningCircle,
  Database,
  Package,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const SMART_LISTS = [
  { id: "today", name: "Bugün", icon: Sun, color: "#0EA5E9" },
  { id: "important", name: "Önemli", icon: Star, color: "#F59E0B" },
  { id: "planned", name: "Planlandı", icon: Calendar, color: "#DC2626" },
  { id: "all", name: "Tümü", icon: ListBullets, color: "#52525B" },
  { id: "completed", name: "Tamamlandı", icon: CheckCircle, color: "#16A34A" },
  { id: "unmatched", name: "Eşleşmeyenler", icon: WarningCircle, color: "#DC2626" },
];

const getNumberFromName = (name = "") => {
  const match = String(name).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export default function Sidebar({
  user,
  theme,
  toggleTheme,
  mobileOpen = false,
  onMobileClose = () => {},
  lists,
  tasks,
  activeView,
  setActiveView,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onLogout,
  searchQ,
  setSearchQ,
  onOpenAI,
  onOpenUsers = () => {},
  onOpenXml = () => {},
  onOpenExcelData = () => {},
  onOpenOrderImport = () => {},

  // AppPage tarafında birazdan bağlayacağız
  onSortLists = () => {},
  onMoveListUp = () => {},
  onMoveListDown = () => {},

  productDataCount = 0,
  productDataUpdatedAt = "",
}) {
  const [newListName, setNewListName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState("");
  const [localSortMode, setLocalSortMode] = useState("manual");

  const isAdmin = user?.role === "admin";

  const submitNewList = (e) => {
    e.preventDefault();

    if (!newListName.trim()) return;

    onCreateList(newListName.trim(), "none");

    setNewListName("");
    setDialogOpen(false);
  };

  const startEditList = (list) => {
    setEditingListId(list.list_id);
    setEditingListName(list.name || "");
  };

  const cancelEditList = () => {
    setEditingListId(null);
    setEditingListName("");
  };

  const saveEditList = (listId) => {
    const nextName = editingListName.trim();

    if (!nextName) return;

    onUpdateList(listId, {
      name: nextName,
    });

    cancelEditList();
  };

  const countSmart = (id) => {
    if (id === "today") return tasks.filter((t) => t.my_day && !t.completed).length;
    if (id === "important") return tasks.filter((t) => t.important && !t.completed).length;
    if (id === "planned") return tasks.filter((t) => t.due_date && !t.completed).length;
    if (id === "all") return tasks.filter((t) => !t.completed).length;
    if (id === "completed") return tasks.filter((t) => t.completed).length;
    if (id === "unmatched") return tasks.filter((t) => t.matched === false).length;

    return 0;
  };

  const isActive = (type, id) => activeView.type === type && activeView.id === id;

  const sortedLists = useMemo(() => {
    const cloned = [...lists];

    if (localSortMode === "az") {
      return cloned.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "tr"));
    }

    if (localSortMode === "za") {
      return cloned.sort((a, b) => String(b.name || "").localeCompare(String(a.name || ""), "tr"));
    }

    if (localSortMode === "numberAsc") {
      return cloned.sort((a, b) => getNumberFromName(a.name) - getNumberFromName(b.name));
    }

    if (localSortMode === "numberDesc") {
      return cloned.sort((a, b) => getNumberFromName(b.name) - getNumberFromName(a.name));
    }

    return cloned;
  }, [lists, localSortMode]);

  const handleSort = (mode) => {
    setLocalSortMode(mode);
    onSortLists(mode);
  };

  return (
    <aside
  className={`w-72 max-w-[86vw] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-screen fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200 ${
    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  }`}
  data-testid="sidebar"
>
      {/* User */}
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <Avatar className="w-10 h-10 rounded-none border border-slate-200">
          <AvatarImage src={user?.picture} />
          <AvatarFallback className="rounded-none bg-[#002FA7] text-white text-sm font-bold">
            {(user?.name || user?.email || user?.username || "?")
              .charAt(0)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div
            className="font-display font-semibold text-sm truncate"
            data-testid="sidebar-user-name"
          >
            {user?.name || "Kullanıcı"}
          </div>

          <div className="text-xs text-slate-500 truncate">
            {user?.email || user?.username || ""}
          </div>

          {user?.role && (
            <div className="text-[10px] text-slate-400 uppercase tracking-[0.18em] mt-0.5">
              {user.role === "admin" ? "Admin" : "Personel"}
            </div>
          )}
        </div>
<button
  type="button"
  onClick={onMobileClose}
  className="md:hidden w-8 h-8 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900"
  aria-label="Menüyü kapat"
>
  ×
</button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none h-8 w-8"
              data-testid="sidebar-user-menu"
            >
              <DotsThree size={20} weight="bold" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="rounded-none">
            {isAdmin && (
              <>
                <DropdownMenuItem
                  onClick={onOpenUsers}
                  data-testid="sidebar-users-menu"
                >
                  <Users size={16} className="mr-2" />
                  Kullanıcı Yönetimi
                </DropdownMenuItem>

                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={onOpenAI} data-testid="sidebar-ai-menu">
              <Sparkle size={16} className="mr-2" />
              AI Asistan
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onLogout}
              className="text-red-600"
              data-testid="sidebar-logout"
            >
              <SignOut size={16} className="mr-2" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

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
          {SMART_LISTS.map((smartList) => {
            const Icon = smartList.icon;
            const count = countSmart(smartList.id);
            const active = isActive("smart", smartList.id);

            return (
              <button
                key={smartList.id}
                onClick={() =>
                  setActiveView({ type: "smart", id: smartList.id })
                }
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  active ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
                data-testid={`smart-list-${smartList.id}`}
              >
                <Icon
                  size={18}
                  weight={active ? "fill" : "regular"}
                  style={{ color: smartList.color }}
                />

                <span
                  className={`flex-1 text-sm ${
                    active ? "font-semibold" : "font-medium"
                  } text-slate-800`}
                >
                  {smartList.name}
                </span>

                {count > 0 && (
                  <span className="text-xs text-slate-500 tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom lists */}
        <div className="mt-6 px-3 flex items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Listelerim
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                title="Liste sıralama"
              >
                <ArrowsDownUp size={16} />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem onClick={() => handleSort("manual")}>
                Manuel Sıralama
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("az")}>
                A’dan Z’ye
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("za")}>
                Z’den A’ya
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("numberAsc")}>
                Küçük sayıdan büyüğe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("numberDesc")}>
                Büyük sayıdan küçüğe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-0.5">
          {sortedLists.map((list) => {
            const active = isActive("list", list.list_id);
            const taskCount = tasks.filter(
              (task) => task.list_id === list.list_id && !task.completed
            ).length;

            return (
              <div
                key={list.list_id}
                className={`group flex items-center gap-2 px-3 py-2 transition-colors ${
                  active ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                <button
                  onClick={() =>
                    setActiveView({ type: "list", id: list.list_id })
                  }
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  data-testid={`list-${list.list_id}`}
                >
                  <House size={18} style={{ color: list.color }} />

                  {editingListId === list.list_id ? (
                    <input
                      value={editingListName}
                      onChange={(e) => setEditingListName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEditList(list.list_id);
                        }

                        if (e.key === "Escape") {
                          cancelEditList();
                        }
                      }}
                      onBlur={() => saveEditList(list.list_id)}
                      className="flex-1 min-w-0 bg-white border border-slate-300 px-2 py-1 text-sm outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`flex-1 text-sm truncate ${
                        active ? "font-semibold" : "font-medium"
                      } text-slate-800`}
                    >
                      {list.name}
                    </span>
                  )}

                  {taskCount > 0 && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      {taskCount}
                    </span>
                  )}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700"
                      data-testid={`list-menu-${list.list_id}`}
                    >
                      <DotsThree size={18} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="rounded-none">
                    <DropdownMenuItem onClick={() => startEditList(list)}>
                      <PencilSimple size={16} className="mr-2" />
                      Adı Düzenle
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <ArrowsDownUp size={16} className="mr-2" />
                        Sıralama
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="rounded-none">
                        <DropdownMenuItem onClick={() => onMoveListUp(list.list_id)}>
                          <ArrowUp size={16} className="mr-2" />
                          Yukarı Taşı
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMoveListDown(list.list_id)}>
                          <ArrowDown size={16} className="mr-2" />
                          Aşağı Taşı
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSort("az")}>
                          A’dan Z’ye
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort("za")}>
                          Z’den A’ya
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort("numberAsc")}>
                          Küçük sayıdan büyüğe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort("numberDesc")}>
                          Büyük sayıdan küçüğe
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => onDeleteList(list.list_id)}
                      className="text-red-600"
                    >
                      <Trash size={16} className="mr-2" />
                      Sil
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
  {isAdmin && (
    <>
      {productDataCount > 0 && (
        <div className="mb-2 border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-[#002FA7]">
          <div className="font-bold flex items-center gap-1">
            <Database size={14} />
            Ürün Data: {productDataCount.toLocaleString("tr-TR")} kayıt
          </div>
          {productDataUpdatedAt && (
            <div className="text-[10px] mt-0.5 opacity-80">
              Son yükleme: {productDataUpdatedAt}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={onOpenXml}
        variant="ghost"
        className="w-full justify-start rounded-none hover:bg-slate-50"
        data-testid="sidebar-open-xml"
      >
        <Barcode size={16} className="mr-2 text-[#002FA7]" />
        <span className="text-sm font-medium">XML Ürün Eşleştirme</span>
      </Button>

      <Button
        onClick={onOpenExcelData}
        variant="ghost"
        className="w-full justify-start rounded-none hover:bg-slate-50"
        data-testid="sidebar-open-excel-data"
      >
        <Database size={16} className="mr-2 text-[#002FA7]" />
        <span className="text-sm font-medium">Ürün Data Excel</span>
      </Button>

      <Button
        onClick={onOpenUsers}
        variant="ghost"
        className="w-full justify-start rounded-none hover:bg-slate-50"
        data-testid="sidebar-open-users"
      >
        <Users size={16} className="mr-2 text-[#002FA7]" />
        <span className="text-sm font-medium">Kullanıcı Yönetimi</span>
      </Button>
    </>
  )}

  <Button
    onClick={onOpenOrderImport}
    variant="ghost"
    className="w-full justify-start rounded-none hover:bg-slate-50"
    data-testid="sidebar-open-order-import"
  >
    <Package size={16} className="mr-2 text-[#002FA7]" />
    <span className="text-sm font-medium">Sipariş Excel Aktar</span>
  </Button>

  <Button
    onClick={toggleTheme}
    variant="ghost"
    className="w-full justify-start rounded-none hover:bg-slate-50"
    data-testid="sidebar-theme-toggle"
  >
    {theme === "dark" ? (
      <Sun size={16} className="mr-2 text-slate-600" />
    ) : (
      <Moon size={16} className="mr-2 text-slate-600" />
    )}

    <span className="text-sm font-medium">
      {theme === "dark" ? "Aydınlık Tema" : "Karanlık Tema"}
    </span>
  </Button>

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
      <Button
        variant="ghost"
        className="w-full justify-start rounded-none hover:bg-slate-50"
        data-testid="sidebar-new-list"
      >
        <Plus size={18} className="mr-2" />
        <span className="text-sm font-medium">Yeni Liste</span>
      </Button>
    </DialogTrigger>

    <DialogContent className="rounded-none">
      <DialogHeader>
        <DialogTitle className="font-display">
          Yeni Liste Oluştur
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={submitNewList} className="space-y-4">
        <div>
          <Label htmlFor="list-name">Liste Adı</Label>
          <Input
            id="list-name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Örn. Siparişler, Depo, Günlük İşler..."
            className="rounded-none mt-1.5"
            autoFocus
            data-testid="new-list-name"
          />
        </div>

        <DialogFooter>
          <Button
            type="submit"
            className="bg-[#002FA7] hover:bg-[#00227A] rounded-none"
            data-testid="new-list-submit"
          >
            Oluştur
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</div>
    </aside>
  );
}