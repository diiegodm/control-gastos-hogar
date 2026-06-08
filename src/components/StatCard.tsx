import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "blue" | "violet" | "teal" | "amber" | "green";
  children?: ReactNode;
};

const tones = {
  blue: "border-blue-200 bg-blue-50/80 text-blue-700",
  violet: "border-violet-200 bg-violet-50/80 text-violet-700",
  teal: "border-teal-200 bg-teal-50/80 text-teal-700",
  amber: "border-amber-200 bg-amber-50/80 text-amber-700",
  green: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
};

export default function StatCard({ label, value, detail, tone = "blue", children }: StatCardProps) {
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
      {detail ? <div className="mt-1 text-sm text-slate-500">{detail}</div> : null}
      {children}
    </div>
  );
}
