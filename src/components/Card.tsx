import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: Props) {
  return (
    <section className={`rounded-2xl border border-[#34434c]/80 bg-[#202d36]/90 p-4 shadow-soft backdrop-blur-xl ${className}`}>
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
  green: "bg-[#26371c] text-[#b7f34a] ring-[#475e30]",
  blue: "bg-[#1b3038] text-[#76d7e1] ring-[#34505a]",
  amber: "bg-[#352c1b] text-[#ffd166] ring-[#5d4a2a]",
  red: "bg-[#351f25] text-[#ff8795] ring-[#5b343d]",
  slate: "bg-[#26333b] text-[#d9e0dc] ring-[#3c4b53]",
};

export function StatCard({ label, value, detail, tone = "slate" }: StatProps) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClass[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-normal text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-sm font-medium text-slate-500">{detail}</p> : null}
    </div>
  );
}
