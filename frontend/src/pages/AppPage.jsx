import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import TaskList from "@/components/TaskList";
import TaskDetail from "@/components/TaskDetail";
import AIAssistant from "@/components/AIAssistant";
import UserManager from "@/components/UserManager";
import ConfirmDialog from "@/components/ConfirmDialog";
import XmlManager from "@/components/XmlManager";
import ExcelDataManager from "@/components/ExcelDataManager";
import OrderImportManager from "@/components/OrderImportManager";
import { getProductData } from "@/lib/excelProducts";
import { api } from "@/lib/api";

const STORAGE_KEYS = {
  productDataUpdatedAt: "sneezy_excel_products_updated_at",
};

const clearStoredUser = () => {
  localStorage.removeItem("sneezy_todo_current_user");
  localStorage.removeItem("todo_user");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
};

const getNumberFromName = (name = "") => {
  const match = String(name).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export default function AppPage({ user, setUser, theme, toggleTheme }) {
  const navigate = useNavigate();

  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState({ type: "smart", id: "today" });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [xmlOpen, setXmlOpen] = useState(false);
  const [excelDataOpen, setExcelDataOpen] = useState(false);
  const [orderImportOpen, setOrderImportOpen] = useState(false);

  const [productDataCount, setProductDataCount] = useState(0);
  const [productDataUpdatedAt, setProductDataUpdatedAt] = useState("");

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Evet",
    cancelText: "Vazgeç",
    danger: true,
    onConfirm: null,
  });

  const [searchQ, setSearchQ] = useState("");

  const handleApiError = useCallback(
    (error, fallbackMessage = "İşlem başarısız oldu") => {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        clearStoredUser();
        setUser?.(null);
        toast.error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
        navigate("/login", { replace: true });
        return;
      }

      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        fallbackMessage;

      toast.error(message);
    },
    [navigate, setUser]
  );

  const openConfirmDialog = ({
    title = "Emin misiniz?",
    message = "Bu işlem geri alınamaz.",
    confirmText = "Evet",
    cancelText = "Vazgeç",
    danger = true,
    onConfirm,
  }) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmText,
      cancelText,
      danger,
      onConfirm,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({
      ...prev,
      open: false,
      onConfirm: null,
    }));
  };

  const refreshProductDataInfo = useCallback(async () => {
    try {
      const products = await getProductData();

      setProductDataCount(Array.isArray(products) ? products.length : 0);

      const storedUpdatedAt = localStorage.getItem(
        STORAGE_KEYS.productDataUpdatedAt
      );

      setProductDataUpdatedAt(storedUpdatedAt || "");
    } catch {
      setProductDataCount(0);
      setProductDataUpdatedAt("");
    }
  }, []);

  const loadLists = useCallback(async () => {
    try {
      const res = await api.get("/lists");
      const nextLists = Array.isArray(res.data) ? res.data : [];

      setLists(nextLists);

      if (nextLists.length > 0 && activeView.type === "list") {
        const activeExists = nextLists.some(
          (list) => list.list_id === activeView.id
        );

        if (!activeExists) {
          setActiveView({ type: "smart", id: "today" });
          setSelectedTaskId(null);
        }
      }
    } catch (error) {
      handleApiError(error, "Listeler alınamadı");
    }
  }, [activeView.id, activeView.type, handleApiError]);

  const loadTasks = useCallback(async () => {
    try {
      const params = {};

      if (searchQ) {
        params.q = searchQ;
      } else if (activeView.type === "smart") {
        params.smart = activeView.id;
      } else if (activeView.type === "list") {
        params.list_id = activeView.id;
      }

      const res = await api.get("/tasks", { params });
      const nextTasks = Array.isArray(res.data) ? res.data : [];

      setTasks(nextTasks);

      if (selectedTaskId) {
        const stillExists = nextTasks.some(
          (task) => task.task_id === selectedTaskId
        );

        if (!stillExists) {
          setSelectedTaskId(null);
        }
      }
    } catch (error) {
      handleApiError(error, "Görevler alınamadı");
    }
  }, [activeView, searchQ, selectedTaskId, handleApiError]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    refreshProductDataInfo();
  }, [refreshProductDataInfo]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Çıkışta backend hatası olsa bile local oturum temizlenir.
    }

    clearStoredUser();
    setUser?.(null);
    navigate("/login", { replace: true });
  };

  const selectedTask =
    tasks.find((task) => task.task_id === selectedTaskId) || null;

  const handleCreateList = async (name, theme_bg = "none") => {
    if (!name?.trim()) {
      toast.error("Liste adı boş olamaz");
      return;
    }

    try {
      const res = await api.post("/lists", {
        name: name.trim(),
        theme_bg,
      });

      const newList = res.data;
      const nextLists = [...lists, newList];

      setLists(nextLists);
      setActiveView({ type: "list", id: newList.list_id });
      setSelectedTaskId(null);

      toast.success("Liste oluşturuldu");
    } catch (error) {
      handleApiError(error, "Liste oluşturulamadı");
    }
  };

  const handleUpdateList = async (list_id, updates) => {
    try {
      const res = await api.patch(`/lists/${list_id}`, updates);
      const updatedList = res.data;

      const nextLists = lists.map((list) =>
        list.list_id === list_id ? updatedList : list
      );

      setLists(nextLists);

      toast.success("Liste güncellendi");
    } catch (error) {
      handleApiError(error, "Liste güncellenemedi");
    }
  };

  const persistListOrder = async (nextLists) => {
    setLists(nextLists);

    try {
      await Promise.all(
        nextLists.map((list, index) =>
          api.patch(`/lists/${list.list_id}`, {
            order: index,
          })
        )
      );
    } catch (error) {
      handleApiError(error, "Liste sıralaması kaydedilemedi");
      await loadLists();
    }
  };

  const handleSortLists = async (mode) => {
    let nextLists = [...lists];

    if (mode === "az") {
      nextLists.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "tr")
      );
    }

    if (mode === "za") {
      nextLists.sort((a, b) =>
        String(b.name || "").localeCompare(String(a.name || ""), "tr")
      );
    }

    if (mode === "numberAsc") {
      nextLists.sort(
        (a, b) => getNumberFromName(a.name) - getNumberFromName(b.name)
      );
    }

    if (mode === "numberDesc") {
      nextLists.sort(
        (a, b) => getNumberFromName(b.name) - getNumberFromName(a.name)
      );
    }

    if (mode === "manual") {
      nextLists = [...lists];
    }

    await persistListOrder(nextLists);
    toast.success("Liste sıralaması güncellendi");
  };

  const handleMoveListUp = async (list_id) => {
    const index = lists.findIndex((list) => list.list_id === list_id);

    if (index <= 0) return;

    const nextLists = [...lists];
    const temp = nextLists[index - 1];

    nextLists[index - 1] = nextLists[index];
    nextLists[index] = temp;

    await persistListOrder(nextLists);
  };

  const handleMoveListDown = async (list_id) => {
    const index = lists.findIndex((list) => list.list_id === list_id);

    if (index === -1 || index >= lists.length - 1) return;

    const nextLists = [...lists];
    const temp = nextLists[index + 1];

    nextLists[index + 1] = nextLists[index];
    nextLists[index] = temp;

    await persistListOrder(nextLists);
  };

  const handleDeleteList = (list_id) => {
    const listToDelete = lists.find((list) => list.list_id === list_id);

    openConfirmDialog({
      title: "Liste silinsin mi?",
      message: `"${listToDelete?.name || "Bu liste"}" listesini silmek üzeresiniz. Bu listeye bağlı görevler de silinir.`,
      confirmText: "Listeyi Sil",
      cancelText: "Vazgeç",
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/lists/${list_id}`);

          const nextLists = lists.filter((list) => list.list_id !== list_id);

          setLists(nextLists);
          setActiveView({ type: "smart", id: "today" });
          setSelectedTaskId(null);

          await loadTasks();

          closeConfirmDialog();
          toast.success("Liste silindi");
        } catch (error) {
          closeConfirmDialog();
          handleApiError(error, "Liste silinemedi");
        }
      },
    });
  };

  const handleCreateTask = async (payload) => {
    if (!payload?.title?.trim()) {
      toast.error("Görev başlığı boş olamaz");
      return;
    }

    const list_id =
      activeView.type === "list" ? activeView.id : payload.list_id || null;

    const my_day =
      activeView.type === "smart" && activeView.id === "today"
        ? true
        : Boolean(payload.my_day);

    const important =
      activeView.type === "smart" && activeView.id === "important"
        ? true
        : Boolean(payload.important);

    const quantity = Number(payload.quantity) > 0 ? Number(payload.quantity) : 1;

    const taskPayload = {
      title: payload.title.trim(),
      notes: payload.notes || "",
      completed: false,
      important,
      my_day,
      due_date: payload.due_date || null,
      reminder_at: payload.reminder_at || null,
      recurrence: payload.recurrence || payload.repeat || "none",
      tags: payload.tags || [],
      steps: payload.steps || [],
      list_id,

      barcode: payload.barcode || "",
      stock_code: payload.stock_code || "",
      quantity,
      initial_quantity: payload.initial_quantity || quantity,

      product_name: payload.product_name || "",
      variant_name: payload.variant_name || "",
      variant_id: payload.variant_id || "",
      product_id: payload.product_id || "",

      image_url: payload.image_url || "",
      image_urls: Array.isArray(payload.image_urls) ? payload.image_urls : [],

      matched: payload.matched,
      match_code: payload.match_code || "",
      source: payload.source || "manual",
    };

    try {
      await api.post("/tasks", taskPayload);
      await loadTasks();
      toast.success("Görev oluşturuldu");
    } catch (error) {
      handleApiError(error, "Görev oluşturulamadı");
    }
  };

  const handleUpdateTask = async (task_id, updates) => {
    try {
      const payload = { ...updates };

      if (payload.repeat && !payload.recurrence) {
        payload.recurrence = payload.repeat;
        delete payload.repeat;
      }

      await api.patch(`/tasks/${task_id}`, payload);
      await loadTasks();
    } catch (error) {
      handleApiError(error, "Görev güncellenemedi");
    }
  };

  const handleDeleteTask = (task_id) => {
    const taskToDelete = tasks.find((task) => task.task_id === task_id);

    openConfirmDialog({
      title: "Görev silinsin mi?",
      message: `"${taskToDelete?.title || "Bu görev"}" görevini silmek üzeresiniz. Bu işlem geri alınamaz.`,
      confirmText: "Görevi Sil",
      cancelText: "Vazgeç",
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/tasks/${task_id}`);

          if (selectedTaskId === task_id) {
            setSelectedTaskId(null);
          }

          await loadTasks();

          closeConfirmDialog();
          toast.success("Görev silindi");
        } catch (error) {
          closeConfirmDialog();
          handleApiError(error, "Görev silinemedi");
        }
      },
    });
  };

  const handleDeleteCompletedTasks = () => {
    const completedTasksInCurrentView = tasks.filter((task) => task.completed);

    if (completedTasksInCurrentView.length === 0) {
      toast.info("Bu listede silinecek tamamlanmış görev yok");
      return;
    }

    openConfirmDialog({
      title: "Tamamlanan görevler silinsin mi?",
      message: `Bu listedeki ${completedTasksInCurrentView.length} tamamlanmış görevi silmek üzeresiniz. Bu işlem geri alınamaz.`,
      confirmText: "Tamamlananları Sil",
      cancelText: "Vazgeç",
      danger: true,
      onConfirm: async () => {
        try {
          await Promise.all(
            completedTasksInCurrentView.map((task) =>
              api.delete(`/tasks/${task.task_id}`)
            )
          );

          setSelectedTaskId(null);
          await loadTasks();

          closeConfirmDialog();
          toast.success("Bu listedeki tamamlanan görevler silindi");
        } catch (error) {
          closeConfirmDialog();
          handleApiError(error, "Tamamlanan görevler silinemedi");
        }
      },
    });
  };

  const handleImportOrders = async ({ rows, listId, mergeSameStock = false }) => {
    const targetListId =
      listId || (activeView.type === "list" ? activeView.id : null);

    if (!targetListId) {
      toast.error("Siparişleri aktarmak için önce bir liste seçin");
      return;
    }

    const sourceRows = Array.isArray(rows) ? rows : [];

    const preparedRows = mergeSameStock
      ? Object.values(
          sourceRows.reduce((acc, row) => {
            const product = row.product;
            const key =
              product?.stock_code ||
              row.stock_code ||
              row.barcode ||
              row.product_id ||
              row.order_row_id;

            if (!acc[key]) {
              acc[key] = {
                ...row,
                quantity: 0,
              };
            }

            acc[key].quantity += Number(row.quantity) || 1;
            return acc;
          }, {})
        )
      : sourceRows;

    try {
      await Promise.all(
        preparedRows.map((row) => {
          const product = row.product;

          const imageUrls = product?.image_urls || [];
          const imageUrl = product?.image_url || imageUrls[0] || "";

          const stockCode =
            product?.stock_code ||
            row.stock_code ||
            row.barcode ||
            row.product_id ||
            "Eşleşmeyen Ürün";

          const quantity = Number(row.quantity) > 0 ? Number(row.quantity) : 1;

          return api.post("/tasks", {
            title: stockCode,
            notes: "",
            completed: false,
            important: false,
            my_day: false,
            due_date: null,
            reminder_at: null,
            recurrence: "none",
            tags: [],
            steps: [],
            list_id: targetListId,

            barcode: product?.barcode || row.barcode || "",
            stock_code: stockCode,
            quantity,
            initial_quantity: quantity,

            product_name: product?.product_name || "",
            variant_name: product?.variant_name || "",
            variant_id: product?.variant_id || row.variant_id || "",
            product_id: product?.product_id || row.product_id || "",

            image_url: imageUrl,
            image_urls: imageUrls,

            matched: Boolean(product),
            match_code: row.stock_code || row.barcode || row.product_id || "",
            source: "order_excel",
          });
        })
      );

      await loadTasks();
      toast.success(`${preparedRows.length} sipariş göreve aktarıldı`);
    } catch (error) {
      handleApiError(error, "Siparişler göreve aktarılamadı");
    }
  };

  const handleTaskCreatedFromAI = async (task) => {
    try {
      await api.post("/tasks", {
        title: task.title || "Yeni görev",
        notes: task.notes || "",
        completed: Boolean(task.completed),
        important: Boolean(task.important),
        my_day: Boolean(task.my_day),
        list_id: task.list_id || (activeView.type === "list" ? activeView.id : null),
        due_date: task.due_date || null,
        recurrence: task.recurrence || "none",
        tags: task.tags || [],
        steps: task.steps || [],
      });

      await loadTasks();
    } catch (error) {
      handleApiError(error, "AI görevi oluşturulamadı");
    }
  };

  const activeList =
    activeView.type === "list"
      ? lists.find((list) => list.list_id === activeView.id)
      : null;

  const activeBg = activeList?.theme_bg || "none";

  return (
    <div
      className="h-screen flex bg-slate-50 overflow-hidden"
      data-testid="app-page"
    >
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-11 h-11 bg-white border border-slate-200 shadow-lg flex items-center justify-center text-xl font-black"
        aria-label="Menüyü aç"
      >
        ☰
      </button>

      {mobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        theme={theme}
        toggleTheme={toggleTheme}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        lists={lists}
        tasks={tasks}
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setSelectedTaskId(null);
          setMobileSidebarOpen(false);
        }}
        onCreateList={handleCreateList}
        onUpdateList={handleUpdateList}
        onDeleteList={handleDeleteList}
        onSortLists={handleSortLists}
        onMoveListUp={handleMoveListUp}
        onMoveListDown={handleMoveListDown}
        onLogout={handleLogout}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        onOpenAI={() => setAiOpen(true)}
        onOpenUsers={() => setUsersOpen(true)}
        onOpenXml={() => setXmlOpen(true)}
        onOpenExcelData={() => setExcelDataOpen(true)}
        onOpenOrderImport={() => setOrderImportOpen(true)}
        productDataCount={productDataCount}
        productDataUpdatedAt={productDataUpdatedAt}
      />

      <TaskList
        view={activeView}
        list={activeList}
        lists={lists}
        tasks={tasks}
        bg={activeBg}
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onDeleteCompletedTasks={handleDeleteCompletedTasks}
      />

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          lists={lists}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updates) => handleUpdateTask(selectedTask.task_id, updates)}
          onDelete={() => handleDeleteTask(selectedTask.task_id)}
        />
      )}

      {aiOpen && (
        <AIAssistant
          onClose={() => setAiOpen(false)}
          activeListId={activeView.type === "list" ? activeView.id : null}
          onTaskCreated={handleTaskCreatedFromAI}
        />
      )}

      {usersOpen && <UserManager onClose={() => setUsersOpen(false)} />}

      {xmlOpen && <XmlManager onClose={() => setXmlOpen(false)} />}

      {excelDataOpen && (
        <ExcelDataManager
          onClose={() => {
            setExcelDataOpen(false);
            refreshProductDataInfo();
          }}
        />
      )}

      {orderImportOpen && (
        <OrderImportManager
          onClose={() => setOrderImportOpen(false)}
          lists={lists}
          onImportOrders={handleImportOrders}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        danger={confirmDialog.danger}
        onCancel={closeConfirmDialog}
        onConfirm={() => {
          if (typeof confirmDialog.onConfirm === "function") {
            confirmDialog.onConfirm();
          }
        }}
      />
    </div>
  );
}