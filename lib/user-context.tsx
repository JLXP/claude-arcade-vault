"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "./types";

type UserContextValue = {
  user: User;
  login: (user: { name: string }) => void;
  loginGuest: () => void;
  logout: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

function readStoredUser(): User {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(readStoredUser);

  const persist = (value: User) => {
    setUser(value);
    try {
      localStorage.setItem("av_user", JSON.stringify(value));
    } catch {}
  };

  const login = (u: { name: string }) => persist(u);
  const loginGuest = () => persist(null);
  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("av_user");
    } catch {}
  };

  return (
    <UserContext.Provider value={{ user, login, loginGuest, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
