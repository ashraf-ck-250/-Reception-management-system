import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Thin top bar while the route changes — gives feedback when using in-app links and navigate().
 */
export function NavigationProgress() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const prev = useRef(location.pathname + location.search);

  useEffect(() => {
    const key = location.pathname + location.search;
    if (key !== prev.current) {
      prev.current = key;
      setVisible(true);
      const t = window.setTimeout(() => setVisible(false), 480);
      return () => window.clearTimeout(t);
    }
  }, [location.pathname, location.search]);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none overflow-hidden transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden
    >
      <div className="h-full w-full bg-primary/15">
        <div className="h-full bg-primary nav-progress-indeterminate shadow-sm" style={{ width: "38%" }} />
      </div>
    </div>
  );
}
