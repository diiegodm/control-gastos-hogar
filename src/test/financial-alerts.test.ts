import { describe, expect, it } from "vitest";
import { buildFinancialAlerts } from "../lib/financialAlerts";

const budget = { id: "budget-food", name: "Mercado", category: "Mercado", limitCents: 10000, color: "lime", icon: "basket", archived: false };
const goal = { id: "goal-trip", name: "Viaje", targetCents: 50000, savedCents: 42000, color: "cyan", icon: "plane", archived: false };
const payment = { id: "fixed-rent", concept: "Renta", amountCents: 80000, payDay: 5, startMonth: "2026-01", dueDate: "2026-11-05", status: "Pendiente" as const, category: "Hogar", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", dueDateForSelectedMonth: "2026-11-12", daysRemaining: 2, isPaid: false };

describe("avisos financieros locales", () => {
  const base = { month: "2026-11", today: "2026-11-10", budgets: [budget], goals: [goal], upcomingPayments: [payment] };

  it("avisa cuando el presupuesto llega al 80% y una meta está cerca", () => {
    const alerts = buildFinancialAlerts({ ...base, categorySpending: [{ category: "Mercado", value: 80 }] });
    expect(alerts.map((item) => item.kind)).toEqual(["budget", "goal", "payment"]);
    expect(alerts[0]).toMatchObject({ level: "warning", message: expect.stringContaining("Te quedan") });
  });

  it("marca límites superados, metas logradas y pagos vencidos como prioritarios", () => {
    const alerts = buildFinancialAlerts({
      ...base,
      categorySpending: [{ category: "Mercado", value: 125 }],
      goals: [{ ...goal, savedCents: goal.targetCents }],
      upcomingPayments: [{ ...payment, daysRemaining: -1 }],
    });
    expect(alerts.map((item) => item.level)).toEqual(["critical", "info", "critical"]);
  });

  it("no genera avisos para datos sanos, metas archivadas ni pagos lejanos", () => {
    const alerts = buildFinancialAlerts({
      ...base,
      goals: [{ ...goal, archived: true }],
      categorySpending: [{ category: "Mercado", value: 40 }],
      upcomingPayments: [{ ...payment, daysRemaining: 8 }],
    });
    expect(alerts).toEqual([]);
  });

  it("avisa de una tendencia mensual solo con diez o más días y un aumento estimado del 20%", () => {
    const alerts = buildFinancialAlerts({
      ...base,
      today: "2026-11-15",
      goals: [],
      categorySpending: [],
      upcomingPayments: [],
      currentMonthSpentCents: 60000,
      previousMonthSpentCents: 100000,
    });
    expect(alerts).toMatchObject([{ id: "spending:trend:2026-11", title: "El gasto va por encima del mes pasado" }]);
    expect(buildFinancialAlerts({
      ...base,
      today: "2026-11-08",
      goals: [],
      categorySpending: [],
      upcomingPayments: [],
      currentMonthSpentCents: 60000,
      previousMonthSpentCents: 100000,
    })).toEqual([]);
  });
});
