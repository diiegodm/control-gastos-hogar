import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: Props) {
  return (
    <section className={`rounded-[1.35rem] border border-white/80 bg-white p-4 shadow-soft ${className}`}>
      {children}
    </section>
  );
}

type StatProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "green" | "blue" | "amber" | "red" | "slate";
};

const toneClass = {
  green: "from-emerald-50 to-lime-50 text-emerald-700 ring-emerald-100",
  blue: "from-sky-50 to-blue-50 text-blue-700 ring-blue-100",
  amber: "from-amber-50 to-orange-50 text-amber-700 ring-amber-100",
  red: "from-rose-50 to-red-50 text-rose-700 ring-rose-100",
  slate: "from-slate-50 to-zinc-50 text-slate-800 ring-slate-100",
};

export function StatCard({ label, value, detail, tone = "slate" }: StatProps) {
  return (
    <div className={`rounded-[1.25rem] bg-gradient-to-br p-4 ring-1 ${toneClass[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-normal text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-sm font-medium text-slate-500">{detail}</p> : null}
    </div>
  );
}
