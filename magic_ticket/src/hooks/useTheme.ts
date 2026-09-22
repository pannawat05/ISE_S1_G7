import { useEffect, useState } from "react";

export function useTheme(defaultDark = false) {
  const [isDarkMode, setIsDarkMode] = useState(defaultDark);

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
