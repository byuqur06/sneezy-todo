import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import TaskList from "@/components/TaskList";
import TaskDetail from "@/components/TaskDetail";
import AIAssistant from "@/components/AIAssistant";

export default function AppPage({ user, setUser }) {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState({ type: "smart", id: "today" });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const loadLists = useCallback(async () => {
    try {
      const res = await api.get("/lists");
      setLists(res.data);
    } catch (e) {
      if (e?.response?.status === 401) navigate("/login");
    }
  }, [navigate]);

  const loadTasks = useCallback(async () => {
    try {
      const params = {};
      if (activeView.type === "smart") params.smart = activeView.id;
      else if (activeView.type === "list") params.list_id = activeView.id;
      if (searchQ) params.q = searchQ;
      const res = await api.get("/tasks", { params });
      setTasks(res.data);
    } catch (e) {
      if (e?.response?.status === 401) navigate("/login");
    }
  }, [activeView, searchQ, navigate]);

  useEffect(() => { loadLists(); }, [loadLists]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    navigate("/login", { replace: true });
  };

  const selectedTask = tasks.find(t => t.task_id === selectedTaskId) || null;

  const handleCreateList = async (name, theme_bg = "none") => {
    try {
      const res = await api.post("/lists", { name, theme_bg });
      setLists([...lists, res.data]);
      setActiveView({ type: "list", id: res.data.list_id });
      toast.success("Liste oluşturuldu");
    } catch {
      toast.error("Liste oluşturulamadı");
    }
  };

  const handleUpdateList = async (list_id, updates) => {
    try {
      const res = await api.patch(`/lists/${list_id}`, updates);
      setLists(lists.map(l => l.list_id === list_id ? res.data : l));
    } catch { toast.error("Güncellenemedi"); }
  };

  const handleDeleteList = async (list_id) => {
    if (!confirm("Listeyi silmek istediğinizden emin misiniz?")) return;
    try {
      await api.delete(`/lists/${list_id}`);
      setLists(lists.filter(l => l.list_id !== list_id));
      setActiveView({ type: "smart", id: "today" });
      toast.success("Liste silindi");
    } catch { toast.error("Silinemedi"); }
  };

  const handleCreateTask = async (payload) => {
    try {
      const list_id = activeView.type === "list" ? activeView.id : null;
      const my_day = activeView.type === "smart" && activeView.id === "today" ? true : payload.my_day;
      const important = activeView.type === "smart" && activeView.id === "important" ? true : payload.important;
      const res = await api.post("/tasks", { ...payload, list_id, my_day, important });
      setTasks([res.data, ...tasks]);
    } catch { toast.error("Görev oluşturulamadı"); }
  };

  const handleUpdateTask = async (task_id, updates) => {
    try {
      const res = await api.patch(`/tasks/${task_id}`, updates);
      setTasks(tasks.map(t => t.task_id === task_id ? res.data : t));
    } catch { toast.error("Güncellenemedi"); }
  };

  const handleDeleteTask = async (task_id) => {
    try {
      await api.delete(`/tasks/${task_id}`);
      setTasks(tasks.filter(t => t.task_id !== task_id));
      if (selectedTaskId === task_id) setSelectedTaskId(null);
      toast.success("Görev silindi");
    } catch { toast.error("Silinemedi"); }
  };

  const activeList = activeView.type === "list" ? lists.find(l => l.list_id === activeView.id) : null;
  const activeBg = activeList?.theme_bg || "none";

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden" data-testid="app-page">
      <Sidebar
        user={user}
        lists={lists}
        tasks={tasks}
        activeView={activeView}
        setActiveView={(v) => { setActiveView(v); setSelectedTaskId(null); }}
        onCreateList={handleCreateList}
        onUpdateList={handleUpdateList}
        onDeleteList={handleDeleteList}
        onLogout={handleLogout}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        onOpenAI={() => setAiOpen(true)}
      />
      <TaskList
        view={activeView}
        list={activeList}
        tasks={tasks}
        bg={activeBg}
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        onUpdateList={handleUpdateList}
      />
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(u) => handleUpdateTask(selectedTask.task_id, u)}
          onDelete={() => handleDeleteTask(selectedTask.task_id)}
        />
      )}
      {aiOpen && (
        <AIAssistant
          onClose={() => setAiOpen(false)}
          activeListId={activeView.type === "list" ? activeView.id : null}
          onTaskCreated={(t) => setTasks([t, ...tasks])}
        />
      )}
    </div>
  );
}
