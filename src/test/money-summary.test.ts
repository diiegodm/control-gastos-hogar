import { describe, expect, it } from "vitest";
import { parseAmount } from "../lib/money";
import { dueDateForMonth, isSameMonth, monthOption, shiftYearMonth } from "../lib/date";
import { monthSummary } from "../lib/summary";
import { calculateCashBalance } from "../lib/cashBalance";
import type { FixedExpense, Movement } from "../types/finance";

describe("parseAmount", () => {
  it.each([
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    [" 1 234,56 € ", 1234.56],
  ])("interpreta %s como %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "-1,00", "12,3,4"]) ("rechaza %s", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe("mes y resumen mensual", () => {
  it("navega entre años y separa meses homónimos", () => {
    expect(shiftYearMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftYearMonth("2026-12", 1)).toBe("2027-01");
    expect(monthOption("2027-01").label).toBe("Enero");
    expect(isSameMonth("2027-01-04", "2027-01")).toBe(true);
    expect(isSameMonth("2026-01-04", "2027-01")).toBe(false);
  });

  it("ajusta el vencimiento al último día del mes", () => {
    expect(dueDateForMonth(31, "2026-02")).toBe("2026-02-28");
    expect(dueDateForMonth(31, "2026-04")).toBe("2026-04-30");
  });

  it("suma ingresos, fijos, variables, mercado y categorías, incluida Ropa", () => {
    const movements: Movement[] = [
      { id: "in", date: "2027-01-05", type: "Ingreso", category: "Otros", description: "Salario", amountCents: 200000, createdAt: "", updatedAt: "" },
      { id: "ropa", date: "2027-01-06", type: "Gasto", category: "Ropa", description: "Abrigo", amountCents: 4000, createdAt: "", updatedAt: "" },
      { id: "market", date: "2027-01-09", type: "Gasto", category: "Mercado", description: "Compra: Leche", amountCents: 1000, source: "market", purchaseId: "buy", createdAt: "", updatedAt: "" },
      { id: "food", date: "2026-01-06", type: "Gasto", category: "Comidas", description: "Fuera de mes", amountCents: 90000, createdAt: "", updatedAt: "" },
    ];
    const fixedExpenses: FixedExpense[] = [
      { id: "fix", concept: "Internet", category: "Otros", amountCents: 3500, payDay: 5, startMonth: "2026-01", createdAt: "", updatedAt: "" },
    ];
    const stateWithInventoryHistory = {
      movements,
      fixedExpenses,
      fixedPayments: [{ id: "fix__2027-01", expenseId: "fix", month: "2027-01", paidAt: "2027-01-05", amountCents: 3500 }],
      purchases: [{ id: "buy", productId: "milk", product: "Leche", totalCents: 1000, date: "2027-01-09", createdAt: "" }],
    };

    const summary = monthSummary(stateWithInventoryHistory, "2027-01");
    expect(summary).toMatchObject({ income: 2000, fixedExpenses: 35, variableExpenses: 50, totalSpent: 85 });
    expect(summary.categoryData.reduce((sum, row) => sum + row.value, 0)).toBe(summary.totalSpent);
    expect(summary.categoryData).toContainEqual({ category: "Ropa", value: 40 });
    expect(summary.categoryData).toContainEqual({ category: "Otros", value: 35 });
    expect(summary.categoryData).toContainEqual({ category: "Mercado", value: 10 });
  });
});

describe("saldo acumulado de caja", () => {
  const settings = { openingBalanceCents: 100000, trackingStartMonth: "2026-11" };

  it("arrastra meses positivos y negativos desde el saldo inicial", () => {
    const movements: Movement[] = [
      { id: "nov-in", date: "2026-11-03", type: "Ingreso", category: "Salario", description: "Nómina", amountCents: 25000, createdAt: "", updatedAt: "" },
      { id: "dec-in", date: "2026-12-03", type: "Ingreso", category: "Salario", description: "Nómina", amountCents: 10000, createdAt: "", updatedAt: "" },
      { id: "jan-out", date: "2027-01-03", type: "Gasto", category: "Otros", description: "Reparación", amountCents: 8000, createdAt: "", updatedAt: "" },
    ];

    expect(calculateCashBalance({ movements, fixedPayments: [], fixedExpenses: [], settings, selectedMonth: "2027-01" })).toMatchObject({
      inheritedBalanceCents: 135000,
      monthlyResultCents: -8000,
      availableBalanceCents: 127000,
    });
  });

  it("cuenta cargos fijos pagados una sola vez si tienen movimiento vinculado", () => {
    const movement: Movement = { id: "fixed-move", date: "2026-11-05", type: "Gasto", category: "Otros", description: "Internet", amountCents: 3500, fixedPaymentId: "internet__2026-11", createdAt: "", updatedAt: "" };
    const fixedPayment = { id: "internet__2026-11", expenseId: "internet", month: "2026-11", paidAt: "2026-11-05", amountCents: 3500, movementId: movement.id };

    expect(calculateCashBalance({ movements: [movement], fixedPayments: [fixedPayment], fixedExpenses: [], settings, selectedMonth: "2026-11" }).monthlyResultCents).toBe(-3500);
    expect(monthSummary({ movements: [movement], fixedExpenses: [], fixedPayments: [fixedPayment] }, "2026-11").totalSpent).toBe(35);
  });

  it("no resta cargos fijos pendientes como si ya fueran dinero pagado", () => {
    const fixedExpenses: FixedExpense[] = [{ id: "rent", concept: "Renta", amountCents: 80000, payDay: 5, startMonth: "2026-11", createdAt: "", updatedAt: "" }];
    expect(monthSummary({ movements: [], fixedExpenses }, "2026-11")).toMatchObject({ fixedExpenses: 0, totalSpent: 0 });
  });

  it("deduplica un movimiento histórico inequívocamente asociado a un pago fijo", () => {
    const expense: FixedExpense = { id: "internet", concept: "Internet", category: "Otros", amountCents: 3500, payDay: 5, startMonth: "2026-11", createdAt: "", updatedAt: "" };
    const movement: Movement = { id: "old-internet", date: "2026-11-05", type: "Gasto", category: "Otros", description: "Internet", amountCents: 3500, createdAt: "", updatedAt: "" };
    const payment = { id: "internet__2026-11", expenseId: expense.id, month: "2026-11", paidAt: "2026-11-05", amountCents: 3500 };

    expect(calculateCashBalance({ movements: [movement], fixedPayments: [payment], fixedExpenses: [expense], settings, selectedMonth: "2026-11" })).toMatchObject({ monthlyResultCents: -3500, possibleDuplicatePayments: 0 });
    expect(monthSummary({ movements: [movement], fixedPayments: [payment], fixedExpenses: [expense] }, "2026-11").totalSpent).toBe(35);
  });

  it("arrastra pagos fijos heredados aunque todavía no tengan movimiento asociado", () => {
    const fixedPayment = { id: "rent__2026-11", expenseId: "rent", month: "2026-11", paidAt: "2026-11-05", amountCents: 80000 };
    expect(calculateCashBalance({ movements: [], fixedPayments: [fixedPayment], fixedExpenses: [], settings, selectedMonth: "2026-11" }).availableBalanceCents).toBe(20000);
  });

  it("no aplica el saldo inicial a meses anteriores al inicio del seguimiento", () => {
    expect(calculateCashBalance({ movements: [], fixedPayments: [], fixedExpenses: [], settings, selectedMonth: "2026-10" })).toMatchObject({
      trackingStarted: false,
      monthlyResultCents: 0,
      availableBalanceCents: null,
    });
  });
});
