"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
};

const BG: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-blue-600",
  warning: "bg-yellow-500",
};

export function Toast({ message, type = "info", duration = 4000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  if (!visible) return null;

  // ACC-02 FIX: Use aria-live="assertive" only for errors (interrupts screen reader immediately).
  // Success/info/warning use aria-live="polite" (waits for screen reader to finish current speech).
  // aria-atomic="true" ensures the full message is re-read if it updates.
  const liveRegion = type === "error" ? "assertive" : "polite";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-white shadow-lg ${BG[type]} animate-fade-in`}
      role="alert"
      aria-live={liveRegion}
      aria-atomic="true"
    >
      <span className="text-lg font-bold" aria-hidden="true">{ICONS[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => { setVisible(false); onClose?.(); }}
        className="ml-2 text-white/70 hover:text-white transition-colors"
        aria-label="Dismiss notification"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}

// Simple hook to manage toast state
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const clearToast = () => setToast(null);

  return { toast, showToast, clearToast };
}
