import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "admin-theme";

function readStored(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/**
 * Light/dark mode for the admin panel only. Dark tokens live under `.dark`
 * (styles.css); Radix portals render into <body>, so the class goes on <html>
 * and is removed on unmount so the student site is unaffected.
 */
export function useAdminTheme() {
  const [theme, setTheme] = useState<Theme>(readStored);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    return () => root.classList.remove("dark");
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable — theme just won't persist */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
