import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("mt-theme") as Theme) ?? "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // ใช้ bg-black เป็น fallback ของ body
  document.body.style.backgroundColor = theme === "dark" ? "#000000" : "#f5f5f7";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("mt-theme", theme);
  }, [theme]);

  // Apply on first render without waiting for effect
  useEffect(() => { applyTheme(getStoredTheme()); }, []);

  const isDarkMode = theme === "dark";
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const setDark  = () => setTheme("dark");
  const setLight = () => setTheme("light");

  return { theme, isDarkMode, toggleTheme, setDark, setLight };
}
