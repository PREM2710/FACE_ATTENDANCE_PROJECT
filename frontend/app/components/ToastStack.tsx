"use client";

export interface ToastItem {
  id: string;
  title: string;
  tone?: "success" | "error" | "info";
}

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

const toneClasses: Record<NonNullable<ToastItem["tone"]>, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-slate-200 bg-white text-slate-900",
};

export default function ToastStack({ items, onDismiss }: ToastStackProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur ${toneClasses[item.tone || "info"]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{item.title}</p>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="text-xs text-slate-500 transition hover:text-slate-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
