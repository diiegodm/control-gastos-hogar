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
import { currency, currencyCents, fromCents, parseAmount, toCents } from "../lib/money";

type Finance = ReturnType<typeof useFinance>;
type NotesModel = ReturnType<typeof useNotes>;
type SpacesModel = ReturnType<typeof useSpaces>;
type Props = { finance: Finance; notes: NotesModel; spaces: SpacesModel; selectedYm: string; onMonthChange: (ym: string) => void };
type Tab = "resumen" | "fijos" | "presupuestos" | "objetivos" | "mercado" | "notas" | "movimientos";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "resumen", label: "Todos" }, { id: "fijos", label: "Recurrentes" },
  { id: "presupuestos", label: "Presupuestos" }, { id: "objetivos", label: "Objetivos" },
  { id: "mercado", label: "Mercado" }, { id: "notas", label: "Notas" }, { id: "movimientos", label: "Movimientos" },
];
const colors = ["#b7f34a", "#36c8d5", "#a77cff", "#ffbd4a", "#ff657a"];

export function Spaces({ finance, notes, spaces, selectedYm, onMonthChange }: Props) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [showBudget, setShowBudget] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [formError, setFormError] = useState("");
  const activeBudgets = spaces.budgets.filter((space) => !space.archived);
  const activeGoals = spaces.goals.filter((space) => !space.archived);
  const spendingByBudget = useMemo(() => {
    const totals = new Map(activeBudgets.map((space) => [space.id, 0]));
    const firstBudgetByCategory = new Map<string, string>();
    activeBudgets.forEach((space) => {
      if (!firstBudgetByCategory.has(space.category)) firstBudgetByCategory.set(space.category, space.id);
    });
    const add = (budgetId: string | undefined, amount: number) => {
      if (budgetId && totals.has(budgetId)) totals.set(budgetId, (totals.get(budgetId) ?? 0) + amount);
    };
    const explicitlyAssigned = new Map<string, number>();
    for (const movement of finance.monthMovements) {
      if (movement.type !== "Gasto") continue;
      if (movement.budgetSpaceId && totals.has(movement.budgetSpaceId)) {
        const amount = fromCents(movement.amountCents);
        add(movement.budgetSpaceId, amount);
        explicitlyAssigned.set(movement.category, (explicitlyAssigned.get(movement.category) ?? 0) + amount);
      }
    }
    for (const { category, value } of finance.summary.categoryData) {
      if (category === "Gastos fijos") continue;
      const target = firstBudgetByCategory.get(category);
      add(target, Math.max(0, value - (explicitlyAssigned.get(category) ?? 0)));
    }
    return totals;
  }, [activeBudgets, finance.monthMovements, finance.summary.categoryData]);

  function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const limit = parseAmount(String(form.get("limit") ?? ""));
    if (limit === null || limit <= 0) { setFormError("El límite debe ser un importe válido mayor que cero."); return; }
    setFormError("");
    spaces.saveBudget({ name: String(form.get("name")).trim(), categoryName: String(form.get("categoryName")).trim(), category: String(form.get("spendingCategory")) as BudgetSpace["category"], limitCents: toCents(limit), icon: String(form.get("icon") || "◉"), color: String(form.get("color") || colors[0]) });
    setShowBudget(false);
  }

  function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = parseAmount(String(form.get("target") ?? ""));
    if (target === null || target <= 0) { setFormError("El objetivo debe ser un importe válido mayor que cero."); return; }
    setFormError("");
    spaces.saveGoal({ name: String(form.get("name")).trim(), categoryName: String(form.get("categoryName")).trim(), targetCents: toCents(target), icon: String(form.get("icon") || "☆"), color: String(form.get("color") || colors[0]) });
    setShowGoal(false);
  }

  function editBudget(space: BudgetSpace) {
    const name = prompt("Nombre del presupuesto", space.name);
    if (name === null) return;
    const rawLimit = prompt("Límite mensual (€)", String(fromCents(space.limitCents)));
    if (rawLimit === null) return;
    const limit = parseAmount(rawLimit);
    if (!name.trim() || limit === null || limit <= 0) { setFormError("El límite debe ser un importe válido mayor que cero."); return; }
    setFormError("");
    spaces.saveBudget({ name: name.trim(), categoryName: space.categoryName, category: space.category, limitCents: toCents(limit), icon: space.icon, color: space.color }, space.id);
  }

  function editGoal(space: GoalSpace) {
    const name = prompt("Nombre del objetivo", space.name);
    if (name === null) return;
    const rawTarget = prompt("Importe objetivo (€)", String(fromCents(space.targetCents)));
    if (rawTarget === null) return;
    const target = parseAmount(rawTarget);
    if (!name.trim() || target === null || target <= 0) { setFormError("El objetivo debe ser un importe válido mayor que cero."); return; }
    setFormError("");
    spaces.saveGoal({ name: name.trim(), categoryName: space.categoryName, targetCents: toCents(target), icon: space.icon, color: space.color }, space.id);
  }

  const BudgetForm = () => (
    <Card><h3 className="font-black">Nuevo presupuesto</h3><form className="mt-3 grid gap-3" onSubmit={submitBudget}>
      <input className="input" name="name" placeholder="Ej. Supermercado" required />
      <input className="input" name="categoryName" list="budget-space-categories" placeholder="Categoría nueva o existente" required /><datalist id="budget-space-categories">{[...new Set([...spaces.budgetCategories, ...movementCategories])].map((category) => <option key={category} value={category} />)}</datalist>
      <div><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="budget-spending-category">Asociar gastos registrados a</label><div className="grid grid-cols-2 gap-2"><select className="input" id="budget-spending-category" name="spendingCategory">{movementCategories.map((category) => <option key={category}>{category}</option>)}</select><input className="input" name="limit" type="text" inputMode="decimal" placeholder="Límite mensual (ej. 500,00)" required /></div></div>
      <div className="flex gap-2"><button className="btn-primary flex-1">Guardar</button><button className="btn-secondary" type="button" onClick={() => setShowBudget(false)}>Cancelar</button></div>
    </form></Card>
  );

  const GoalForm = () => (
    <Card><h3 className="font-black">Nuevo objetivo</h3><form className="mt-3 grid gap-3" onSubmit={submitGoal}>
      <input className="input" name="name" placeholder="Ej. Viaje de verano" required />
      <input className="input" name="categoryName" list="goal-space-categories" placeholder="Categoría del objetivo (opcional)" /><datalist id="goal-space-categories">{spaces.goalCategories.map((category) => <option key={category} value={category} />)}</datalist>
      <input className="input" name="target" type="text" inputMode="decimal" placeholder="Importe objetivo (ej. 1.200,50)" required />
      <div className="flex gap-2"><button className="btn-primary flex-1">Crear objetivo</button><button className="btn-secondary" type="button" onClick={() => setShowGoal(false)}>Cancelar</button></div>
    </form></Card>
  );

  return <div className="space-y-5">
    <div><p className="text-sm font-semibold text-slate-400">Organiza tu dinero</p><h1 className="mt-1 text-2xl font-black">Mis espacios</h1></div>
    {formError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</p> : null}
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((item) => <button key={item.id} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === item.id ? "bg-[#b7f34a] text-[#18210d]" : "border border-[#30383b] bg-[#1a2228] text-slate-300"}`} type="button" onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>

    {(tab === "resumen" || tab === "presupuestos") && <section className="page-transition space-y-3">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Presupuestos</h2><p className="text-sm text-slate-400">Control mensual por categoría</p></div><button className="btn-primary" onClick={() => setShowBudget(!showBudget)} type="button">+ Crear</button></div>
      {showBudget && <BudgetForm />}
      {activeBudgets.length ? activeBudgets.map((space) => { const spent = spendingByBudget.get(space.id) ?? 0; const limit = fromCents(space.limitCents); const pct = Math.min(100, spent / limit * 100); return <Card key={space.id}>
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${space.color}22`, color: space.color }}>{space.icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate font-black">{space.name}</p><p className="text-sm font-bold">{currency(spent)} <span className="text-slate-500">/ {currencyCents(space.limitCents)}</span></p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#30383b]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? "#ff8795" : space.color }} /></div><p className={`mt-1 text-xs ${pct >= 90 ? "text-rose-400" : "text-slate-400"}`}>{currency(Math.max(0, limit - spent))} restante · {Math.round(pct)}%</p></div></div>
        <div className="mt-3 flex justify-end gap-2"><button className="btn-secondary !min-h-9" onClick={() => editBudget(space)} type="button">Editar</button><button className="btn-secondary !min-h-9" onClick={() => spaces.archive("budget", space.id)} type="button">Archivar</button><button className="btn-danger !min-h-9" onClick={() => { if (confirm("¿Eliminar este presupuesto?")) spaces.remove("budget", space.id); }} type="button">Eliminar</button></div>
      </Card>; }) : <EmptyState title="Sin presupuestos" body="Crea un límite mensual para una categoría. No modificará tus movimientos." />}
    </section>}

    {(tab === "resumen" || tab === "objetivos") && <section className="page-transition space-y-3">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Objetivos</h2><p className="text-sm text-slate-400">Ahorros separados de tus gastos</p></div><button className="btn-primary" onClick={() => setShowGoal(!showGoal)} type="button">+ Crear</button></div>
      {showGoal && <GoalForm />}
      {activeGoals.length ? activeGoals.map((goal) => {
        const pct = Math.min(100, goal.savedCents / goal.targetCents * 100);
        return <Card key={goal.id}>
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${goal.color}22`, color: goal.color }}>{goal.icon}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate font-black">{goal.name}</p><p className="text-sm font-bold">{Math.round(pct)}%</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#30383b]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: goal.color }} /></div><p className="mt-1 text-xs text-slate-400">{currencyCents(goal.savedCents)} de {currencyCents(goal.targetCents)}</p></div></div>
          <div className="mt-3 flex flex-wrap justify-end gap-2"><button className="btn-primary !min-h-9" type="button" onClick={() => { const raw = prompt("Aportación al objetivo (€)"); if (raw === null) return; const amount = parseAmount(raw); if (amount === null || amount <= 0) { setFormError("La aportación debe ser un importe válido mayor que cero."); return; } setFormError(""); spaces.contribute(goal.id, toCents(amount)); }}>+ Aportar</button><button className="btn-secondary !min-h-9" type="button" onClick={() => editGoal(goal)}>Editar</button><button className="btn-secondary !min-h-9" type="button" onClick={() => spaces.archive("goal", goal.id)}>Archivar</button><button className="btn-danger !min-h-9" type="button" onClick={() => { if (confirm("¿Eliminar este objetivo?")) spaces.remove("goal", goal.id); }}>Eliminar</button></div>
          {goal.contributions?.length ? <div className="mt-3 border-t border-[#34434c] pt-3"><p className="mb-2 text-xs font-bold uppercase text-slate-400">Aportaciones recientes</p><div className="flex flex-wrap gap-2">{goal.contributions.slice(-3).reverse().map((entry, index) => <span key={`${entry.date}-${index}`} className="rounded-lg bg-[#26343c] px-2.5 py-1.5 text-xs font-semibold text-slate-300">+{currencyCents(entry.amountCents)} · {new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(entry.date))}</span>)}</div></div> : null}
          <p className="mt-2 text-xs text-slate-500">Las aportaciones se guardan como ahorro y no se cuentan como gasto.</p>
        </Card>;
      }) : <EmptyState title="Sin objetivos" body="Crea una meta y registra aportaciones." />}
    </section>}

    {tab === "fijos" && <div className="page-transition"><FixedExpenses finance={finance} /></div>}
    {tab === "mercado" && <div className="page-transition"><Market selectedYm={selectedYm} onMonthChange={onMonthChange} finance={finance} /></div>}
    {tab === "notas" && <div className="page-transition"><Notes notes={notes} /></div>}
    {tab === "movimientos" && <div className="page-transition"><Movements selectedYm={selectedYm} onMonthChange={onMonthChange} finance={finance} customCategories={[...spaces.budgetCategories, ...spaces.movementCategories]} budgetSpaces={activeBudgets} onCreateCategory={spaces.addMovementCategory} /></div>}
  </div>;
}
