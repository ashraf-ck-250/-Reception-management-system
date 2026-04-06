import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type UserRole = "admin" | "receptionist";

interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  setUserProfile: (nextUser: User) => void;
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
        const nextUser = { id: found.id, name: found.name, email: found.email, role: found.role, avatarUrl: found.avatarUrl };
        setUser(nextUser);
        localStorage.setItem("auth_user", JSON.stringify(nextUser));
        if (token) localStorage.setItem("auth_token", token);
        return nextUser;
      }
      return null;
    } catch {
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
  };

  const setUserProfile = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem("auth_user", JSON.stringify(nextUser));
  };

  return <AuthContext.Provider value={{ user, login, logout, setUserProfile }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
