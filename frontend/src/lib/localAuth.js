import { api } from "@/lib/api";

const SESSION_KEY = "sneezy_todo_current_user";

const normalize = (value) => {
  return String(value || "").trim().toLowerCase();
};

const normalizeRole = (role) => {
  const value = normalize(role);

  if (value === "admin" || value === "yönetici" || value === "yonetici") {
    return "admin";
  }

  return "staff";
};

const normalizeUser = (user) => {
  if (!user) return null;

  const userId = user.user_id || user.id;

  return {
    id: userId,
    user_id: userId,
    name: user.name || "",
    username: user.username || "",
    role: normalizeRole(user.role),
    active: user.active !== false,
    created_at: user.created_at || "",
    updated_at: user.updated_at || "",
  };
};

const saveSessionUser = (user) => {
  const normalizedUser = normalizeUser(user);

  if (!normalizedUser) return null;

  localStorage.setItem(SESSION_KEY, JSON.stringify(normalizedUser));
  localStorage.setItem("todo_user", JSON.stringify(normalizedUser));
  localStorage.setItem("auth_user", JSON.stringify(normalizedUser));
  localStorage.setItem("user", JSON.stringify(normalizedUser));
  localStorage.setItem("isAuthenticated", "true");

  return normalizedUser;
};

const clearSessionUser = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("todo_user");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
};

const getErrorMessage = (error, fallback = "İşlem başarısız oldu") => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const loginLocalUser = async (username, password) => {
  try {
    const res = await api.post("/auth/login", {
      username,
      password,
    });

    const user = saveSessionUser(res.data?.user);

    return {
      ok: true,
      user,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Kullanıcı adı veya şifre hatalı"),
    };
  }
};

export const logoutLocalUser = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // Backend kapalıysa bile local oturumu temizle.
  }

  clearSessionUser();
};

export const getCurrentUser = () => {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) ||
      localStorage.getItem("todo_user") ||
      localStorage.getItem("auth_user") ||
      localStorage.getItem("user");

    const user = raw ? JSON.parse(raw) : null;

    return normalizeUser(user);
  } catch {
    return null;
  }
};

export const refreshCurrentUserFromBackend = async () => {
  try {
    const res = await api.get("/auth/me");
    return saveSessionUser(res.data);
  } catch {
    clearSessionUser();
    return null;
  }
};

export const getUsers = async () => {
  try {
    const res = await api.get("/users");
    return Array.isArray(res.data) ? res.data.map(normalizeUser) : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Kullanıcılar alınamadı"));
  }
};

export const addLocalUser = async ({
  name,
  username,
  password,
  role = "staff",
}) => {
  try {
    const res = await api.post("/users", {
      name,
      username,
      password,
      role: normalizeRole(role),
      active: true,
    });

    return {
      ok: true,
      user: normalizeUser(res.data),
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Kullanıcı eklenemedi"),
    };
  }
};

export const updateLocalUser = async (userId, updates) => {
  try {
    const payload = {
      ...updates,
    };

    if (payload.role) {
      payload.role = normalizeRole(payload.role);
    }

    const res = await api.patch(`/users/${userId}`, payload);

    return normalizeUser(res.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Kullanıcı güncellenemedi"));
  }
};

export const removeLocalUser = async (userId) => {
  try {
    await api.delete(`/users/${userId}`);

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Kullanıcı silinemedi"),
    };
  }
};

export const isAdminUser = (user) => {
  return normalizeRole(user?.role) === "admin";
};

export const getRoleLabel = (role) => {
  return normalizeRole(role) === "admin" ? "Yönetici" : "Personel";
};