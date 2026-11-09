import { describe, expect, it } from "vitest";
import { buildMascotAdvice } from "../lib/mascotAdvice";
import { currency } from "../lib/money";
import type { BudgetSpace, GoalSpace } from "../types/spaces";
import type { FixedExpense } from "../types/finance";

const budget: BudgetSpace = { id: "market", name: "Mercado", category: "Mercado", limitCents: 10000, color: "#b7f34a", icon: "◉", archived: false };
const goal: GoalSpace = { id: "trip", name: "Viaje", targetCents: 100000, savedCents: 75000, color: "#b7f34a", icon: "☆", archived: false };
const payment: FixedExpense & { dueDateForSelectedMonth: string; daysRemaining: number; isPaid: boolean } = {
  id: "rent", concept: "Renta", amountCents: 50000, payDay: 5, startMonth: "2026-11", createdAt: "2026-01-01", updatedAt: "2026-01-01",
  dueDateForSelectedMonth: "2026-11-10", daysRemaining: 1, isPaid: false,
};

describe("consejos de Plantita basados en registros reales", () => {
  it("informa el remanente del presupuesto, el objetivo y el vencimiento próximo", () => {
    const advice = buildMascotAdvice({
      budgets: [budget], goals: [goal], categorySpending: [{ category: "Mercado", value: 80 }], upcomingPayments: [payment],
    });
    expect(advice.map((item) => item.kind)).toEqual(["budget", "goal", "payment"]);
    expect(advice[0].message).toContain(`Te quedan ${currency(20)} en Mercado`);
    expect(advice[1].message).toContain(`le faltan ${currency(250)}`);
    expect(advice[2].message).toContain("Renta vence en 1 día");
  });

  it("no inventa consejos cuando no hay datos, ni avisa por pagos ya pagados", () => {
    expect(buildMascotAdvice({ budgets: [], goals: [], categorySpending: [], upcomingPayments: [{ ...payment, isPaid: true }] })).toEqual([]);
  });

  it("describe un exceso con neutralidad y omite presupuestos archivados", () => {
    const advice = buildMascotAdvice({
      budgets: [budget, { ...budget, id: "archived", archived: true }], goals: [],
      categorySpending: [{ category: "Mercado", value: 120 }], upcomingPayments: [],
    });
    expect(advice).toEqual([{ id: "budget:market", kind: "budget", message: `Mercado: el gasto registrado supera el límite por ${currency(20)}.` }]);
  });
});
