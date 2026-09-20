"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken, setToken, type Role, type User } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
    role: Exclude<Role, "admin">
  ) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => refresh());
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await api.login(email, password);
    setToken(token);
    setUser(user);
  }

  async function register(
    fullName: string,
    email: string,
    password: string,
    role: Exclude<Role, "admin">
  ) {
    const { token, user } = await api.register(fullName, email, password, role);
    setToken(token);
    setUser(user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, ready, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  return { user, ready };
}

// Redirects to /login if signed out, or to /library if signed in with a role
// that isn't allowed — e.g. a client hitting /admin directly by URL. This is
// a UX guard, not the security boundary: every route it protects is also
// enforced server-side.
export function useRequireRole(roles: Role[]) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const rolesKey = roles.join(",");

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!rolesKey.split(",").includes(user.role)) {
      router.replace("/library");
    }
  }, [ready, user, router, rolesKey]);

  const allowed = !!user && rolesKey.split(",").includes(user.role);
  return { user, ready: ready && allowed };
}
