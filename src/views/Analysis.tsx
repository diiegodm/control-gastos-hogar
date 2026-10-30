import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { MonthSelector } from "../components/MonthSelector";
import { currency } from "../lib/money";
import { currentYear, months } from "../lib/date";
import type { useFinance } from "../hooks/useFinance";

type Finance = ReturnType<typeof useFinance>;
const colors = ["#b7f34a", "#36c8d5", "#ffbd4a", "#a77cff", "#ff657a", "#65d38e", "#788780"];

export function Analysis({ finance, selectedMonth, onMonthChange }: { finance: Finance; selectedMonth: number; onMonthChange: (month: number) => void }) {
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const monthly = useMemo(() => {
    return Array.from({ length: period }, (_, index) => {
      const monthIndex = (selectedMonth - period + 1 + index + 12) % 12;
      const year = currentYear + Math.floor((selectedMonth - period + 1 + index) / 12);
      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const movements = finance.movements.filter((item) => item.date.startsWith(key));
      const purchases = finance.purchases.filter((item) => item.date.startsWith(key));
      const income = movements.filter((item) => item.type === "Ingreso").reduce((sum, item) => sum + item.amount, 0);
      const expenses = movements.filter((item) => item.type === "Gasto").reduce((sum, item) => sum + item.amount, 0) + purchases.reduce((sum, item) => sum + item.price, 0);
      return { month: months[monthIndex].shortLabel, ingresos: income, gastos: expenses };
    });
  }, [finance.movements, finance.purchases, period, selectedMonth]);

  const categoryTotal = finance.dashboard.categoryData.reduce((sum, item) => sum + item.value, 0);

  return <div className="space-y-5">
    <div><p className="text-sm font-semibold text-slate-400">Tus números, con contexto</p><h1 className="mt-1 text-2xl font-black">Análisis</h1></div>
    <MonthSelector value={selectedMonth} onChange={onMonthChange} />
    <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#192313] p-4 ring-1 ring-[#304422]"><p className="text-xs font-bold uppercase text-slate-400">Ingresos</p><p className="mt-2 text-xl font-black text-[#b7f34a]">{currency(finance.dashboard.income)}</p></div><div className="rounded-2xl bg-[#25191d] p-4 ring-1 ring-[#45272e]"><p className="text-xs font-bold uppercase text-slate-400">Gastos</p><p className="mt-2 text-xl font-black text-[#ff8795]">{currency(finance.dashboard.totalSpent)}</p></div></div>
    <Card><div className="flex items-start justify-between gap-3"><div><h2 className="font-black">Ingresos y gastos</h2><p className="mt-1 text-sm text-slate-400">Datos registrados por mes</p></div><select className="input !h-10 !w-auto !px-3 text-sm" value={period} onChange={(event) => setPeriod(Number(event.target.value) as 3 | 6 | 12)}><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option></select></div><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ left: -20, right: 4 }}><CartesianGrid stroke="#30383b" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" tick={{ fill: "#9aa7a2", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#82908a", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#202d36", border: "1px solid #3b4a52", borderRadius: 12 }} formatter={(value) => currency(Number(value))} /><Bar dataKey="ingresos" fill="#b7f34a" radius={[5, 5, 0, 0]} /><Bar dataKey="gastos" fill="#ff8795" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="mt-2 flex gap-5 text-xs font-semibold text-slate-400"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#b7f34a]"/>Ingresos</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#ff8795]"/>Gastos variables</span></div></Card>
    <Card><h2 className="font-black">Gasto por categoría</h2><p className="mt-1 text-sm text-slate-400">{months[selectedMonth].label} · {currency(categoryTotal)} registrados</p>{finance.dashboard.categoryData.length ? <div className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={finance.dashboard.categoryData} dataKey="value" nameKey="category" innerRadius={52} outerRadius={82} paddingAngle={3}><>{finance.dashboard.categoryData.map((entry, i) => <Cell key={entry.category} fill={colors[i % colors.length]} />)}</></Pie><Tooltip contentStyle={{ background: "#202d36", border: "1px solid #3b4a52", borderRadius: 12 }} formatter={(value) => currency(Number(value))} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{finance.dashboard.categoryData.map((entry, i) => <div key={entry.category} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} /><span className="flex-1 text-slate-300">{entry.category}</span><b>{currency(entry.value)}</b></div>)}</div></div> : <p className="mt-5 text-sm text-slate-400">Aún no hay gastos suficientes para distribuir.</p>}</Card>
  </div>;
}
