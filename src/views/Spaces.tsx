import { useMemo, useState, type FormEvent } from "react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { FixedExpenses } from "./FixedExpenses";
import { Market } from "./Market";
import { Movements } from "./Movements";
import { Notes } from "./Notes";
import type { useFinance } from "../hooks/useFinance";
import type { useNotes } from "../hooks/useNotes";
import type { useSpaces } from "../hooks/useSpaces";
import { movementCategories } from "../types/finance";
import type { BudgetSpace, GoalSpace } from "../types/spaces";
import { currency } from "../lib/money";

type Finance = ReturnType<typeof useFinance>;
type NotesModel = ReturnType<typeof useNotes>;
type SpacesModel = ReturnType<typeof useSpaces>;
type Props = { finance: Finance; notes: NotesModel; spaces: SpacesModel; selectedMonth: number; onMonthChange: (month: number) => void };
type Tab = "resumen" | "fijos" | "presupuestos" | "objetivos" | "mercado" | "notas" | "movimientos";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "resumen", label: "Todos" }, { id: "fijos", label: "Recurrentes" },
  { id: "presupuestos", label: "Presupuestos" }, { id: "objetivos", label: "Objetivos" },
  { id: "mercado", label: "Mercado" }, { id: "notas", label: "Notas" }, { id: "movimientos", label: "Movimientos" },
];
const colors = ["#b7f34a", "#36c8d5", "#a77cff", "#ffbd4a", "#ff657a"];

export function Spaces({ finance, notes, spaces, selectedMonth, onMonthChange }: Props) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [showBudget, setShowBudget] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const activeBudgets = spaces.budgets.filter((space) => !space.archived);
  const activeGoals = spaces.goals.filter((space) => !space.archived);
  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const movement of finance.monthMovements) {
      if (movement.type === "Gasto") map.set(movement.category, (map.get(movement.category) ?? 0) + movement.amount);
    }
    for (const purchase of finance.monthPurchases) map.set("Mercado", (map.get("Mercado") ?? 0) + purchase.price);
    return map;
  }, [finance.monthMovements, finance.monthPurchases]);

  function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    spaces.saveBudget({ name: String(form.get("name")).trim(), category: String(form.get("category")) as BudgetSpace["category"], limit: Number(form.get("limit")), icon: String(form.get("icon") || "◉"), color: String(form.get("color") || colors[0]) });
    setShowBudget(false);
  }

  function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    spaces.saveGoal({ name: String(form.get("name")).trim(), target: Number(form.get("target")), icon: String(form.get("icon") || "☆"), color: String(form.get("color") || colors[0]) });
    setShowGoal(false);
  }

  function editBudget(space: BudgetSpace) {
    const name = prompt("Nombre del presupuesto", space.name);
    if (name === null) return;
    const limit = Number(prompt("Límite mensual (€)", String(space.limit)));
    if (!name.trim() || !Number.isFinite(limit) || limit <= 0) return;
    spaces.saveBudget({ name: name.trim(), category: space.category, limit, icon: space.icon, color: space.color }, space.id);
  }

  function editGoal(space: GoalSpace) {
    const name = prompt("Nombre del objetivo", space.name);
    if (name === null) return;
    const target = Number(prompt("Importe objetivo (€)", String(space.target)));
    if (!name.trim() || !Number.isFinite(target) || target <= 0) return;
    spaces.saveGoal({ name: name.trim(), target, icon: space.icon, color: space.color }, space.id);
  }

  const BudgetForm = () => (
    <Card><h3 className="font-black">Nuevo presupuesto</h3><form className="mt-3 grid gap-3" onSubmit={submitBudget}>
      <input className="input" name="name" placeholder="Ej. Supermercado" required />
      <div className="grid grid-cols-2 gap-2"><select className="input" name="category">{movementCategories.map((category) => <option key={category}>{category}</option>)}</select><input className="input" name="limit" type="number" min="0.01" step="0.01" placeholder="Límite mensual" required /></div>
      <div className="flex gap-2"><button className="btn-primary flex-1">Guardar</button><button className="btn-secondary" type="button" onClick={() => setShowBudget(false)}>Cancelar</button></div>
    </form></Card>
  );

  const GoalForm = () => (
    <Card><h3 className="font-black">Nuevo objetivo</h3><form className="mt-3 grid gap-3" onSubmit={submitGoal}>
      <input className="input" name="name" placeholder="Ej. Viaje de verano" required />
      <input className="input" name="target" type="number" min="0.01" step="0.01" placeholder="Importe objetivo" required />
      <div className="flex gap-2"><button className="btn-primary flex-1">Crear objetivo</button><button className="btn-secondary" type="button" onClick={() => setShowGoal(false)}>Cancelar</button></div>
    </form></Card>
  );

  return <div className="space-y-5">
    <div><p className="text-sm font-semibold text-slate-400">Organiza tu dinero</p><h1 className="mt-1 text-2xl font-black">Mis espacios</h1></div>
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((item) => <button key={item.id} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === item.id ? "bg-[#b7f34a] text-[#18210d]" : "border border-[#30383b] bg-[#1a2228] text-slate-300"}`} type="button" onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>

    {(tab === "resumen" || tab === "presupuestos") && <section className="space-y-3">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Presupuestos</h2><p className="text-sm text-slate-400">Control mensual por categoría</p></div><button className="btn-primary" onClick={() => setShowBudget(!showBudget)} type="button">+ Crear</button></div>
      {showBudget && <BudgetForm />}
      {activeBudgets.length ? activeBudgets.map((space) => { const spent = spendingByCategory.get(space.category) ?? 0; const pct = Math.min(100, spent / space.limit * 100); return <Card key={space.id}>
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${space.color}22`, color: space.color }}>{space.icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate font-black">{space.name}</p><p className="text-sm font-bold">{currency(spent)} <span className="text-slate-500">/ {currency(space.limit)}</span></p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#30383b]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? "#ff8795" : space.color }} /></div><p className={`mt-1 text-xs ${pct >= 90 ? "text-rose-400" : "text-slate-400"}`}>{currency(Math.max(0, space.limit - spent))} restante · {Math.round(pct)}%</p></div></div>
        <div className="mt-3 flex justify-end gap-2"><button className="btn-secondary !min-h-9" onClick={() => editBudget(space)} type="button">Editar</button><button className="btn-secondary !min-h-9" onClick={() => spaces.archive("budget", space.id)} type="button">Archivar</button><button className="btn-danger !min-h-9" onClick={() => { if (confirm("¿Eliminar este presupuesto?")) spaces.remove("budget", space.id); }} type="button">Eliminar</button></div>
      </Card>; }) : <EmptyState title="Sin presupuestos" body="Crea un límite mensual para una categoría. No modificará tus movimientos." />}
    </section>}

    {(tab === "resumen" || tab === "objetivos") && <section className="space-y-3">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Objetivos</h2><p className="text-sm text-slate-400">Ahorros separados de tus gastos</p></div><button className="btn-primary" onClick={() => setShowGoal(!showGoal)} type="button">+ Crear</button></div>
      {showGoal && <GoalForm />}
      {activeGoals.length ? activeGoals.map((goal) => { const pct = Math.min(100, goal.saved / goal.target * 100); return <Card key={goal.id}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${goal.color}22`, color: goal.color }}>{goal.icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate font-black">{goal.name}</p><p className="text-sm font-bold">{Math.round(pct)}%</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#30383b]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: goal.color }} /></div><p className="mt-1 text-xs text-slate-400">{currency(goal.saved)} de {currency(goal.target)}</p></div></div><div className="mt-3 flex flex-wrap justify-end gap-2"><button className="btn-primary !min-h-9" type="button" onClick={() => { const amount = Number(prompt("Aportación al objetivo (€)")); if (Number.isFinite(amount) && amount > 0) spaces.contribute(goal.id, amount); }}>+ Aportar</button><button className="btn-secondary !min-h-9" type="button" onClick={() => editGoal(goal)}>Editar</button><button className="btn-secondary !min-h-9" type="button" onClick={() => spaces.archive("goal", goal.id)}>Archivar</button><button className="btn-danger !min-h-9" type="button" onClick={() => { if (confirm("¿Eliminar este objetivo?")) spaces.remove("goal", goal.id); }}>Eliminar</button></div>{goal.contributions?.length ? <div className="mt-3 border-t border-[#34434c] pt-3"><p className="mb-2 text-xs font-bold uppercase text-slate-400">Aportaciones recientes</p><div className="flex flex-wrap gap-2">{goal.contributions.slice(-3).reverse().map((entry, index) => <span key={`${entry.date}-${index}`} className="rounded-lg bg-[#26343c] px-2.5 py-1.5 text-xs font-semibold text-slate-300">+{currency(entry.amount)} · {new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(entry.date))}</span>)}</div></div> : null}<p className="mt-2 text-xs text-slate-500">Las aportaciones se guardan como ahorro y no se cuentan como gasto.</p></Card>; }) : <EmptyState title="Sin objetivos" body="Crea una meta y registra aportaciones." />}
    </section>}

    {tab === "fijos" && <FixedExpenses finance={finance} />}
    {tab === "mercado" && <Market selectedMonth={selectedMonth} onMonthChange={onMonthChange} finance={finance} />}
    {tab === "notas" && <Notes notes={notes} />}
    {tab === "movimientos" && <Movements selectedMonth={selectedMonth} onMonthChange={onMonthChange} finance={finance} />}
  </div>;
}
