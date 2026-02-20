"use client";

import { useRef, useEffect, useCallback } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore, initializeAuth, validateSession } from "@/lib/store";

interface ReduxProviderProps {
  children: React.ReactNode;
}

export default function ReduxProvider({ children }: ReduxProviderProps) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
  }

  // Initialize auth on mount
  useEffect(() => {
    if (storeRef.current) {
      // Initialize auth from localStorage
      storeRef.current.dispatch(initializeAuth());

      // Set up periodic session validation (every 30 seconds)
      const intervalId = setInterval(() => {
        if (storeRef.current) {
          storeRef.current.dispatch(validateSession());
        }
      }, 30000);

      // Listen for storage events (for multi-tab sync)
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === "session" || event.key === "session_token") {
          if (storeRef.current) {
            storeRef.current.dispatch(initializeAuth());
          }
        }
      };

      window.addEventListener("storage", handleStorageChange);

      // Validate on window focus (user came back to tab)
      const handleFocus = () => {
        if (storeRef.current) {
          storeRef.current.dispatch(validateSession());
        }
      };

      window.addEventListener("focus", handleFocus);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
