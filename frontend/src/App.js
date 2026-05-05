import { useEffect, useState } from "react";
import "@/App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "@/pages/LoginPage";
import AppPage from "@/pages/AppPage";

function getStoredUser() {
  try {
    const savedUser =
      localStorage.getItem("todo_user") ||
      localStorage.getItem("auth_user") ||
      localStorage.getItem("user");

    if (!savedUser) return null;

    const parsedUser = JSON.parse(savedUser);

    if (!parsedUser?.id && !parsedUser?.user_id) {
      return null;
    }

    return parsedUser;
  } catch {
    return null;
  }
}

function clearStoredUser() {
  localStorage.removeItem("sneezy_todo_current_user");
  localStorage.removeItem("todo_user");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
}

function AppShell({ theme, toggleTheme }) {
  const [user, setUserState] = useState(() => getStoredUser());

  const setUser = (nextUser) => {
    if (!nextUser) {
      clearStoredUser();
      setUserState(null);
      return;
    }

    localStorage.setItem("todo_user", JSON.stringify(nextUser));
    localStorage.setItem("auth_user", JSON.stringify(nextUser));
    localStorage.setItem("user", JSON.stringify(nextUser));
    localStorage.setItem("isAuthenticated", "true");

    setUserState(nextUser);
  };

  useEffect(() => {
    const currentUser = getStoredUser();
    setUserState(currentUser);
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppPage
      user={user}
      setUser={setUser}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}

function LoginRedirect({ theme, toggleTheme }) {
  const currentUser = getStoredUser();

  if (currentUser) {
    return <Navigate to="/app" replace />;
  }

  return (
    <LoginPage
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}

function AppRouter({ theme, toggleTheme }) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <LoginRedirect
            theme={theme}
            toggleTheme={toggleTheme}
          />
        }
      />

      <Route
        path="/app"
        element={
          <AppShell
            theme={theme}
            toggleTheme={toggleTheme}
          />
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("sneezy_theme") || "light";
  });

  useEffect(() => {
    localStorage.setItem("sneezy_theme", theme);

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`App ${theme === "dark" ? "dark" : "light"}`}>
      <BrowserRouter>
        <AppRouter theme={theme} toggleTheme={toggleTheme} />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;