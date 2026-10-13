import { useEffect, useState } from "react";

export function useTheme(defaultDark = false) {
  const [isDarkMode, setIsDarkMode] = useState(defaultDark);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return { isDarkMode, toggleTheme };
}
