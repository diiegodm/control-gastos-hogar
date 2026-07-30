import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { MonthSelector } from "../components/MonthSelector";
import { formatDate, months } from "../lib/date";
import { currency } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";

type Finance = ReturnType<typeof useFinance>;

type Props = {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  finance: Finance;
  onOpenNutrition?: () => void;
};

const chartColors = ["#2563EB", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#22C55E", "#64748B"];

const alertClasses = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  yellow: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-rose-50 text-rose-700 ring-rose-100",
};

export function Dashboard({ selectedMonth, onMonthChange, finance, onOpenNutrition }: Props) {
  const { dashboard } = finance;
  const selected = months.find((month) => month.value === selectedMonth);

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-slate-300">Finanzas del hogar</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Resumen de {selected?.label}</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-300">
          Lo importante del mes, sin ruido: ingresos, gastos, pagos y reposición.
        </p>
      </div>

      <MonthSelector value={selectedMonth} onChange={onMonthChange} />

      {onOpenNutrition ? (
        <button
          className="w-full rounded-[1.35rem] border border-emerald-100 bg-emerald-50 p-4 text-left shadow-sm transition hover:bg-emerald-100 active:scale-[0.99]"
          type="button"
          onClick={onOpenNutrition}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Alimentación</p>
              <p className="mt-1 text-lg font-black text-slate-950">Abrir Comer</p>
              <p className="mt-1 text-sm font-medium text-slate-600">Menú semanal, recetas y cocina.</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              ◐
            </span>
          </div>
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ingresos" value={currency(dashboard.income)} tone="green" />
        <StatCard label="Gastos variables" value={currency(dashboard.variableExpenses)} tone="amber" />
        <StatCard label="Gastos fijos" value={currency(dashboard.fixedExpenses)} tone="blue" />
        <StatCard label="Mercado" value={currency(dashboard.marketTotal)} tone="slate" />
        <div className="col-span-2">
          <StatCard
            label="Dinero disponible"
            value={currency(dashboard.available)}
            detail="Ingresos - fijos - variables"
            tone={dashboard.available >= 0 ? "green" : "red"}
          />
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Gastos por categoría</h2>
            <p className="text-sm text-slate-500">Solo movimientos del mes seleccionado.</p>
          </div>
        </div>
        {dashboard.categoryData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.categoryData} dataKey="value" nameKey="category" innerRadius={58} outerRadius={90} paddingAngle={3}>
                  {dashboard.categoryData.map((entry, index) => (
                    <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => currency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="Sin gastos todavía" body="Registra gastos en Movimientos para ver esta gráfica." />
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-black text-slate-950">Fijos vs variables</h2>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.fixedVsVariable} margin={{ left: -18, right: 8, top: 10 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => currency(Number(value))} />
              <Bar dataKey="value" radius={[14, 14, 4, 4]}>
                <Cell fill="#2563EB" />
                <Cell fill="#F59E0B" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black text-slate-950">Próximos pagos</h2>
        <div className="mt-3 space-y-2">
          {dashboard.upcomingPayments.length > 0 ? (
            dashboard.upcomingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <div>
                  <p className="font-bold text-slate-900">{payment.concept}</p>
                  <p className="text-sm text-slate-500">{formatDate(payment.dueDateForSelectedMonth)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-950">{currency(payment.amount)}</p>
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
        <h2 className="text-lg font-black text-slate-950">Lista de reposición</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {dashboard.restockProducts.length > 0 ? (
            dashboard.restockProducts.map((product) => (
              <span key={product.id} className="rounded-full bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
                {product.product}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No hay productos por reponer.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
