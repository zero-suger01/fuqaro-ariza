"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, setToken } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

interface TokenResponse {
  access_token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<AuthUser>;
  register: (data: { first_name: string; last_name?: string; phone: string; password: string; language?: string }) => Promise<AuthUser>;
  logout: () => void;
  /** Serverdan `me` ni qayta o'qiydi — parol almashtirilgandan keyin
   *  `must_change_password` bayrog'i yangilanishi uchun (v1.4). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet<AuthUser>("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const res = await apiPost<TokenResponse>("/api/auth/login", { login: loginValue, password });
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: { first_name: string; last_name?: string; phone: string; password: string; language?: string }) => {
      const res = await apiPost<TokenResponse>("/api/auth/register", { language: "uz", ...data });
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      setUser(await apiGet<AuthUser>("/api/auth/me"));
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
