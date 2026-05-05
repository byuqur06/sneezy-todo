import { useEffect, useMemo, useState } from "react";
import {
  X,
  Plus,
  Trash,
  UserCircle,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  MagnifyingGlass,
  Users,
  CheckCircle,
  PencilSimple,
  Key,
  WarningCircle,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getUsers,
  addLocalUser,
  updateLocalUser,
  removeLocalUser,
  getCurrentUser,
  isAdminUser,
  getRoleLabel,
} from "@/lib/localAuth";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "",
  username: "",
  password: "",
  role: "staff",
  active: true,
};

export default function UserManager({ onClose }) {
  const [users, setUsers] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mode, setMode] = useState("create");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const currentUser = getCurrentUser();

  const loadUsers = async () => {
    setLoadingUsers(true);

    try {
      const result = await getUsers();
      setUsers(Array.isArray(result) ? result : []);
    } catch (error) {
      setUsers([]);
      toast.error(error.message || "Kullanıcılar alınamadı");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];

    return {
      total: safeUsers.length,
      active: safeUsers.filter((user) => user.active).length,
      passive: safeUsers.filter((user) => !user.active).length,
      admins: safeUsers.filter((user) => isAdminUser(user)).length,
      staff: safeUsers.filter((user) => !isAdminUser(user)).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];

    return safeUsers.filter((user) => {
      const q = searchQ.trim().toLowerCase();

      const matchesSearch =
        !q ||
        user.name?.toLowerCase().includes(q) ||
        user.username?.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "all"
          ? true
          : roleFilter === "admin"
          ? isAdminUser(user)
          : !isAdminUser(user);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? user.active
          : !user.active;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQ, roleFilter, statusFilter]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetCreateForm = () => {
    setMode("create");
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
  };

  const startEditUser = (user) => {
    setMode("edit");
    setEditingUser(user);
    setForm({
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: isAdminUser(user) ? "admin" : "staff",
      active: Boolean(user.active),
    });
    setShowPassword(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error("Ad soyad, kullanıcı adı ve şifre zorunludur");
      return;
    }

    const result = await addLocalUser({
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      role: form.role,
    });

    if (!result.ok) {
      toast.error(result.message || "Kullanıcı eklenemedi");
      return;
    }

    toast.success("Kullanıcı eklendi");
    resetCreateForm();
    await loadUsers();
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (!editingUser) return;

    if (!form.name.trim() || !form.username.trim()) {
      toast.error("Ad soyad ve kullanıcı adı zorunludur");
      return;
    }

    const usernameUsed = users.some(
      (user) =>
        user.id !== editingUser.id &&
        user.username.toLowerCase() === form.username.trim().toLowerCase()
    );

    if (usernameUsed) {
      toast.error("Bu kullanıcı adı başka bir kullanıcıda mevcut");
      return;
    }

    const adminCount = users.filter((user) => isAdminUser(user)).length;
    const editingUserIsAdmin = isAdminUser(editingUser);
    const nextRoleIsAdmin = form.role === "admin";

    if (editingUserIsAdmin && !nextRoleIsAdmin && adminCount <= 1) {
      toast.error("Son yönetici kullanıcının rolü personel yapılamaz");
      return;
    }

    if (editingUser.id === currentUser?.id && !nextRoleIsAdmin) {
      toast.error("Kendi yönetici yetkinizi kaldıramazsınız");
      return;
    }

    if (editingUser.id === currentUser?.id && !form.active) {
      toast.error("Kendi hesabınızı pasif yapamazsınız");
      return;
    }

    const updates = {
      name: form.name.trim(),
      username: form.username.trim(),
      role: form.role,
      active: Boolean(form.active),
    };

    if (form.password.trim()) {
      updates.password = form.password.trim();
    }

    try {
      await updateLocalUser(editingUser.id, updates);
      toast.success("Kullanıcı güncellendi");

      await loadUsers();

      const refreshedUsers = await getUsers();
      const refreshedUser = refreshedUsers.find(
        (user) => user.id === editingUser.id
      );

      if (refreshedUser) {
        startEditUser(refreshedUser);
      }
    } catch (error) {
      toast.error(error.message || "Kullanıcı güncellenemedi");
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error("Kendi hesabınızı pasif yapamazsınız");
      return;
    }

    try {
      await updateLocalUser(user.id, {
        active: !user.active,
      });

      toast.success(
        user.active ? "Kullanıcı pasif yapıldı" : "Kullanıcı aktif yapıldı"
      );

      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Kullanıcı durumu güncellenemedi");
    }
  };

  const handleRemoveUser = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error("Kendi hesabınızı silemezsiniz");
      return;
    }

    const adminCount = users.filter((item) => isAdminUser(item)).length;

    if (isAdminUser(user) && adminCount <= 1) {
      toast.error("Son yönetici kullanıcı silinemez");
      return;
    }

    if (!confirm(`${user.name} kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    const result = await removeLocalUser(user.id);

    if (!result.ok) {
      toast.error(result.message || "Kullanıcı silinemedi");
      return;
    }

    toast.success("Kullanıcı silindi");

    if (editingUser?.id === user.id) {
      resetCreateForm();
    }

    await loadUsers();
  };

  const panelTitle =
    mode === "create" ? "Yeni Kullanıcı Ekle" : "Kullanıcıyı Düzenle";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 flex justify-center">
      <div className="w-full max-w-7xl max-h-[92vh] bg-white border border-slate-200 shadow-[0_30px_100px_rgba(15,23,42,0.28)] overflow-y-auto flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#002FA7] mb-1">
              Sneezy Görev
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              Kullanıcı Yönetimi
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Uygulamaya erişebilecek kullanıcıları, rolleri ve şifreleri yönetin.
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

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px]">
          <section className="bg-[#F8F9FA] border-r border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-white">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard icon={Users} title="Toplam" value={stats.total} desc="Kullanıcı" />
                <StatCard icon={CheckCircle} title="Aktif" value={stats.active} desc="Giriş açık" />
                <StatCard icon={ToggleLeft} title="Pasif" value={stats.passive} desc="Giriş kapalı" />
                <StatCard icon={ShieldCheck} title="Yönetici" value={stats.admins} desc="Yetkili" />
                <StatCard icon={UserCircle} title="Personel" value={stats.staff} desc="Standart" />
              </div>
            </div>

            <div className="p-5 border-b border-slate-200 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_170px_170px] gap-3">
                <div className="relative">
                  <MagnifyingGlass
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="İsim veya kullanıcı adı ara..."
                    className="pl-10 rounded-none h-11 border-slate-200 bg-white"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-11 border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="all">Tüm Roller</option>
                  <option value="admin">Yönetici</option>
                  <option value="staff">Personel</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="passive">Pasif</option>
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scroll-area p-5">
              <div className="space-y-3">
                {loadingUsers && (
                  <div className="bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
                    Kullanıcılar yükleniyor...
                  </div>
                )}

                {!loadingUsers &&
                  filteredUsers.map((item) => (
                    <UserCard
                      key={item.id}
                      user={item}
                      currentUser={currentUser}
                      selected={editingUser?.id === item.id}
                      onEdit={() => startEditUser(item)}
                      onToggle={() => handleToggleActive(item)}
                      onDelete={() => handleRemoveUser(item)}
                    />
                  ))}

                {!loadingUsers && filteredUsers.length === 0 && (
                  <div className="bg-white border border-dashed border-slate-300 p-10 text-center">
                    <div className="font-display text-xl font-bold text-slate-800">
                      Kullanıcı bulunamadı
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Arama veya filtreleri değiştirerek tekrar deneyin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="bg-white p-6 overflow-y-auto scroll-area">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
                  {mode === "create" ? "Yeni Hesap" : "Düzenleme"}
                </div>
                <h3 className="font-display text-2xl font-black tracking-tight text-slate-900">
                  {panelTitle}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {mode === "create"
                    ? "Yeni bir yönetici veya personel hesabı oluşturun."
                    : "Kullanıcı bilgilerini, rolünü veya şifresini güncelleyin."}
                </p>
              </div>

              {mode === "edit" && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-slate-200"
                  onClick={resetCreateForm}
                >
                  <Plus size={16} className="mr-2" />
                  Yeni
                </Button>
              )}
            </div>

            {mode === "edit" && editingUser && (
              <div className="mt-5 border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#002FA7] flex items-start gap-2">
                <PencilSimple size={18} className="mt-0.5" />
                <div>
                  <strong>{editingUser.name}</strong> kullanıcısını düzenliyorsunuz.
                  Şifre alanını boş bırakırsanız mevcut şifre korunur.
                </div>
              </div>
            )}

            <form
              onSubmit={mode === "create" ? handleAddUser : handleUpdateUser}
              className="space-y-5 mt-6"
            >
              <Field label="Ad Soyad">
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Örn. Ahmet Yılmaz"
                  className="rounded-none h-11 border-slate-200"
                />
              </Field>

              <Field label="Kullanıcı Adı">
                <Input
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="Örn. ahmet"
                  className="rounded-none h-11 border-slate-200"
                />
              </Field>

              <Field label={mode === "create" ? "Şifre" : "Yeni Şifre"}>
                <div className="relative">
                  <Key
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder={
                      mode === "create"
                        ? "Şifre belirle"
                        : "Boş bırakırsanız değişmez"
                    }
                    className="rounded-none h-11 border-slate-200 pl-9 pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <Field label="Rol">
                <select
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  className="w-full h-11 border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="staff">Personel</option>
                  <option value="admin">Yönetici</option>
                </select>
              </Field>

              {mode === "edit" && (
                <Field label="Durum">
                  <select
                    value={form.active ? "active" : "passive"}
                    onChange={(e) =>
                      handleChange("active", e.target.value === "active")
                    }
                    className="w-full h-11 border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="active">Aktif</option>
                    <option value="passive">Pasif</option>
                  </select>
                </Field>
              )}

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  className="w-full rounded-none h-11 bg-[#002FA7] hover:bg-[#00227A]"
                >
                  {mode === "create" ? (
                    <>
                      <Plus size={18} className="mr-2" />
                      Kullanıcı Ekle
                    </>
                  ) : (
                    <>
                      <PencilSimple size={18} className="mr-2" />
                      Kullanıcıyı Güncelle
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-none h-11 border-slate-200"
                  onClick={resetCreateForm}
                >
                  Formu Temizle
                </Button>
              </div>
            </form>

            <div className="mt-8 border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">
                <WarningCircle size={16} />
                Yetki Notları
              </div>
              <ul className="text-sm text-slate-600 space-y-2 leading-relaxed">
                <li>• Yönetici kullanıcılar kullanıcı yönetimi ekranını görebilir.</li>
                <li>• Personel kullanıcılar görev ve liste işlemlerini kullanabilir.</li>
                <li>• Pasif kullanıcılar giriş yapamaz.</li>
                <li>• Son yönetici kullanıcı silinemez veya personel yapılamaz.</li>
                <li>• Kendi hesabınızı silemez veya pasif yapamazsınız.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, desc }) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-[0.16em] font-bold text-slate-500">
          {title}
        </span>
        <Icon size={18} className="text-[#002FA7]" />
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function UserCard({ user, currentUser, selected, onEdit, onToggle, onDelete }) {
  const admin = isAdminUser(user);

  return (
    <div
      className={`bg-white border p-4 transition-colors ${
        selected
          ? "border-[#002FA7] ring-1 ring-[#002FA7]"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 flex items-center justify-center border ${
            user.active
              ? admin
                ? "bg-violet-50 border-violet-200 text-violet-700"
                : "bg-blue-50 border-blue-200 text-[#002FA7]"
              : "bg-slate-100 border-slate-200 text-slate-400"
          }`}
        >
          {admin ? (
            <ShieldCheck size={24} weight="bold" />
          ) : (
            <UserCircle size={24} weight="bold" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="font-semibold text-slate-900 text-base truncate">
              {user.name}
            </div>

            {user.id === currentUser?.id && (
              <Badge className="bg-blue-50 text-[#002FA7] border-blue-100">
                Sen
              </Badge>
            )}

            <Badge
              className={
                admin
                  ? "bg-violet-50 text-violet-700 border-violet-100"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }
            >
              {getRoleLabel(user.role)}
            </Badge>

            <Badge
              className={
                user.active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-red-50 text-red-600 border-red-100"
              }
            >
              {user.active ? "Aktif" : "Pasif"}
            </Badge>
          </div>

          <div className="text-sm text-slate-600">
            Kullanıcı adı:{" "}
            <span className="font-medium text-slate-800">{user.username}</span>
          </div>

          <div className="text-xs text-slate-400 mt-1">
            Oluşturulma:{" "}
            {user.created_at
              ? new Date(user.created_at).toLocaleString("tr-TR")
              : "-"}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="rounded-none border-slate-200"
          >
            <PencilSimple size={16} className="mr-2" />
            Düzenle
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onToggle}
            className="rounded-none border-slate-200"
          >
            {user.active ? (
              <>
                <ToggleRight size={18} className="mr-2" />
                Pasif Yap
              </>
            ) : (
              <>
                <ToggleLeft size={18} className="mr-2" />
                Aktif Yap
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="rounded-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash size={16} className="mr-2" />
            Sil
          </Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span
      className={`text-[10px] px-2 py-1 border font-medium uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}