import { describe, expect, it } from "vitest";
import { parseAmount } from "../lib/money";
import { dueDateForMonth, isSameMonth, monthOption, shiftYearMonth } from "../lib/date";
import { monthSummary } from "../lib/summary";
import type { FixedExpense, MarketPurchase, Movement } from "../types/finance";

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
      { id: "food", date: "2026-01-06", type: "Gasto", category: "Comidas", description: "Fuera de mes", amountCents: 90000, createdAt: "", updatedAt: "" },
    ];
    const fixedExpenses: FixedExpense[] = [
      { id: "fix", concept: "Internet", amountCents: 3500, payDay: 5, startMonth: "2026-01", createdAt: "", updatedAt: "" },
    ];
    const purchases: MarketPurchase[] = [
      { id: "buy", productId: "milk", product: "Leche", totalCents: 1000, date: "2027-01-09", createdAt: "" },
    ];

    const summary = monthSummary({ movements, fixedExpenses, purchases }, "2027-01");
    expect(summary).toMatchObject({ income: 2000, fixedExpenses: 35, variableExpenses: 50, totalSpent: 85 });
    expect(summary.categoryData.reduce((sum, row) => sum + row.value, 0)).toBe(summary.totalSpent);
    expect(summary.categoryData).toContainEqual({ category: "Ropa", value: 40 });
    expect(summary.categoryData).toContainEqual({ category: "Gastos fijos", value: 35 });
  });
});
