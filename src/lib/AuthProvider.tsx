"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  api,
  clearToken,
  getToken,
  setToken,
  type Permission,
  type Role,
  type User,
} from "@/lib/api";
import { slugify } from "@/lib/slug";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<SignedIn>;
  loginWithGoogle: (credential: string) => Promise<SignedIn>;
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
    const { token, user, welcomeBack } = await api.login(email, password);
    setToken(token);
    setUser(user);
    return { ...user, welcomeBack: !!welcomeBack };
  }

  async function loginWithGoogle(credential: string) {
    const { token, user, welcomeBack } = await api.loginWithGoogle(credential);
    setToken(token);
    setUser(user);
    return { ...user, welcomeBack: !!welcomeBack };
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
      value={{ user, ready, login, loginWithGoogle, register, logout, refresh }}
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

// An account owner who hasn't added a card yet. The free trial needs one, so
// they're sent to /billing to start it before using the app (the server
// also withholds every entitlement until then).
export function needsCard(user: User | null) {
  return user?.role === "client" && user.account?.role === "owner" && !!user.account.needsCard;
}

// An owner who deleted their account and came back: no new trial, so the
// app stays on /billing until they subscribe (the server withholds every
// entitlement too). Their library's ads aren't shown until then.
export function mustSubscribe(user: User | null) {
  return (
    user?.role === "client" && user.account?.role === "owner" && !!user.account.paymentRequired
  );
}

export function useRequireAuth({ allowWithoutCard = false } = {}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const blocked = !allowWithoutCard && (needsCard(user) || mustSubscribe(user));

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (blocked) router.replace("/billing");
  }, [ready, user, blocked, router]);

  return { user, ready: ready && !blocked };
}

// Where to land after signing in: clients go straight to their own library
// rather than via /library, which loads every ad on the server only to send
// them on.
export function libraryPath(user: User) {
  if (mustSubscribe(user)) return "/billing";
  return user.role === "client" ? `/library/${slugify(user.fullName)}` : "/library";
}

// A signed-in user, and whether signing in just reactivated a deleted account.
export type SignedIn = User & { welcomeBack: boolean };

// The toast after signing in: a welcome back for a reactivated account.
export function signedInMessage(user: SignedIn, usual: string) {
  return user.welcomeBack
    ? `Welcome back, ${user.fullName.trim().split(/\s+/)[0]}! Your account is active again.`
    : usual;
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

// Like useRequireRole, for the blog and brand page admin screens: admins, or
// users an admin has granted that permission to. Also enforced server-side.
export function useRequirePermission(permission: Permission) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const allowed = !!user?.permissions?.[permission];

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!allowed) router.replace("/library");
  }, [ready, user, allowed, router]);

  return { user, ready: ready && allowed };
}
