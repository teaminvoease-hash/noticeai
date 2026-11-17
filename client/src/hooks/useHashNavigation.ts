import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// BrowserRouter updates history without native anchor scrolling. Retry on render
// so destinations loaded from the API can appear before we move focus once.
export function useHashNavigation() {
  const { hash, key } = useLocation();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!hash) {
      handled.current = null;
      return;
    }
    if (handled.current === key) return;
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ block: "start", behavior: "auto" });
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    handled.current = key;
  });
}
