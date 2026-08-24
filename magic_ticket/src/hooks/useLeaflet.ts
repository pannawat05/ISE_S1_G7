import { useState, useEffect } from "react";

const LEAFLET_VERSION = "1.9.4";
const CSS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const JS_URL  = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

let loadPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URL;
      document.head.appendChild(link);
    }

    // JS (already loaded by a previous render)
    if ((window as Window & { L?: unknown }).L) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = JS_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useLeaflet() {
  const [ready, setReady] = useState(
    typeof window !== "undefined" && !!(window as Window & { L?: unknown }).L,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    loadLeaflet()
      .then(() => setReady(true))
      .catch((e: Error) => setError(e.message));
  }, []);

  return { ready, error };
}
