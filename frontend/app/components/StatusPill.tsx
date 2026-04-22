interface StatusPillProps {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
}

const toneClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

export default function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
