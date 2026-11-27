"use client";

import type React from "react";
import { createContext, useContext, useEffect } from "react";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

type ThemeContextType = {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-color-scheme", "light");
    localStorage.setItem("theme-mode", "light");
    localStorage.setItem("theme", "light");
  }, []);

  const setThemeMode = () => {};
  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider
      value={{ theme: "light", themeMode: "light", setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
