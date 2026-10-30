import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { MonthSelector } from "../components/MonthSelector";
import { formatDate, months } from "../lib/date";
import { currency } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { useSpaces } from "../hooks/useSpaces";

type Finance = ReturnType<typeof useFinance>;
type SpacesModel = ReturnType<typeof useSpaces>;

type Props = {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  finance: Finance;
  spaces: SpacesModel;
  onOpenSpaces: () => void;
};

const chartColors = ["#a6ff00", "#36c8d5", "#ffbd4a", "#a77cff", "#ff657a", "#65d38e", "#697574"];

const alertClasses = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  yellow: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-rose-50 text-rose-700 ring-rose-100",
};

export function Dashboard({ selectedMonth, onMonthChange, finance, spaces, onOpenSpaces }: Props) {
  const { dashboard } = finance;
  const selected = months.find((month) => month.value === selectedMonth);
  const totalExpenses = dashboard.fixedExpenses + dashboard.variableExpenses;

  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-400">Hola, Diego 👋</p>
          <h1 className="mt-1 text-2xl font-black text-slate-50">Tu hogar este mes</h1>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#303638] bg-[#171b1d] text-lg" aria-hidden="true">
          ◉
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Balance disponible</p>
          <p className={`mt-1 truncate text-3xl font-black ${dashboard.available >= 0 ? "text-[#b5ff4a]" : "text-rose-400"}`}>
            {currency(dashboard.available)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Ingresos menos gastos del mes</p>
        </div>
        <div className="w-32">
          <MonthSelector value={selectedMonth} onChange={onMonthChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ingresos" value={currency(dashboard.income)} tone="green" />
        <StatCard label="Gastos" value={currency(totalExpenses)} tone="red" />
        <StatCard label="Gastos fijos" value={currency(dashboard.fixedExpenses)} tone="blue" />
        <StatCard label="Gastos variables" value={currency(dashboard.variableExpenses)} tone="amber" />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-black text-slate-50">Tus espacios favoritos</h2><p className="mt-1 text-sm text-slate-400">Presupuestos y objetivos activos</p></div>
          <button className="text-sm font-bold text-[#b7f34a]" type="button" onClick={onOpenSpaces}>Ver todos</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[...spaces.budgets.filter((item) => !item.archived).slice(0, 2), ...spaces.goals.filter((item) => !item.archived).slice(0, 2)].slice(0, 4).map((space) => {
            const goal = "target" in space;
            const amount = goal ? space.saved : space.limit;
            const total = goal ? space.target : space.limit;
            const progress = goal ? Math.min(100, amount / total * 100) : 0;
            return <button key={space.id} onClick={onOpenSpaces} type="button" className="rounded-xl border border-[#30383b] bg-[#1b252b] p-3 text-left"><span className="text-lg">{space.icon}</span><p className="mt-1 truncate text-sm font-bold">{space.name}</p><p className="mt-1 text-xs text-slate-400">{goal ? `${currency(amount)} / ${currency(total)}` : `${currency(total)} / mes`}</p>{goal ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#354047]"><div className="h-full rounded-full bg-[#b7f34a]" style={{ width: `${progress}%` }} /></div> : null}</button>;
          })}
          {spaces.budgets.filter((item) => !item.archived).length + spaces.goals.filter((item) => !item.archived).length === 0 ? <button onClick={onOpenSpaces} type="button" className="col-span-2 rounded-xl border border-dashed border-[#3a484e] p-4 text-left text-sm text-slate-400">Crea tu primer presupuesto u objetivo <span className="ml-1 font-bold text-[#b7f34a]">+</span></button> : null}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-50">Movimientos recientes</h2><p className="mt-1 text-sm text-slate-400">Actividad del mes</p></div><button type="button" className="text-sm font-bold text-[#b7f34a]" onClick={onOpenSpaces}>Ver todos</button></div>
        <div className="space-y-2">{finance.monthMovements.slice(0, 4).length ? finance.monthMovements.slice(0, 4).map((movement) => <div key={movement.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#1b252b] p-3"><div className="min-w-0"><p className="truncate font-bold">{movement.description}</p><p className="text-xs text-slate-400">{movement.category} · {formatDate(movement.date)}</p></div><p className={`shrink-0 font-black ${movement.type === "Ingreso" ? "text-[#b7f34a]" : "text-slate-100"}`}>{movement.type === "Ingreso" ? "+" : "−"}{currency(movement.amount)}</p></div>) : <EmptyState title="Sin movimientos este mes" body="Usa el botón + para registrar el primero." />}</div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-50">Gastos por categoría</h2>
            <p className="mt-1 text-sm text-slate-400">{selected?.label} · distribución del gasto</p>
          </div>
          <span className="rounded-full bg-[#202624] px-3 py-1.5 text-xs font-bold text-[#b5ff4a]">Mes</span>
        </div>
        {dashboard.categoryData.length > 0 ? (
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.categoryData}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={58}
                  outerRadius={91}
                  paddingAngle={3}
                  stroke="#15191b"
                >
                  {dashboard.categoryData.map((entry, index) => (
                    <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#202628", border: "1px solid #343c3d", borderRadius: 12, color: "#f5f5f5" }}
                  formatter={(value) => currency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="Sin gastos todavía" body="Registra gastos en Movimientos para ver el análisis por categoría." />
          </div>
        )}
        {dashboard.categoryData.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#293031] pt-3">
            {dashboard.categoryData.slice(0, 6).map((entry, index) => (
              <div key={entry.category} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                <span className="truncate text-slate-400">{entry.category}</span>
                <span className="ml-auto font-bold text-slate-200">{currency(entry.value)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-50">Próximos pagos</h2>
            <p className="mt-1 text-sm text-slate-400">Gastos fijos de {selected?.label}</p>
          </div>
          <span className="text-sm font-bold text-[#b5ff4a]">{dashboard.upcomingPayments.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {dashboard.upcomingPayments.length > 0 ? (
            dashboard.upcomingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#1c2223] p-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-100">{payment.concept}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatDate(payment.dueDateForSelectedMonth)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-black text-slate-100">{currency(payment.amount)}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${alertClasses[payment.alert]}`}>
                    {payment.daysRemaining < 0 ? "Vencido" : `${payment.daysRemaining} días`}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Sin pagos pendientes" body="Los gastos fijos pendientes aparecerán aquí." />
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-50">Lista de reposición</h2>
            <p className="mt-1 text-sm text-slate-400">Productos que están llegando al mínimo</p>
          </div>
          <span className="rounded-full bg-[#302713] px-3 py-1.5 text-xs font-bold text-[#ffd166]">
            {dashboard.restockProducts.length} pendientes
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {dashboard.restockProducts.length > 0 ? (
            dashboard.restockProducts.map((product) => (
              <span key={product.id} className="rounded-lg bg-[#242a24] px-3 py-2 text-sm font-bold text-slate-200">
                {product.product}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-400">No hay productos por reponer.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
