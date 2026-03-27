import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type UserRole = "admin" | "receptionist";

interface User {
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("auth_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser) as User);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const found = response.data.user as User;
      const token = response.data.token as string | undefined;
      if (found) {
        setUser({ name: found.name, email: found.email, role: found.role });
        localStorage.setItem("auth_user", JSON.stringify({ name: found.name, email: found.email, role: found.role }));
        if (token) localStorage.setItem("auth_token", token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
