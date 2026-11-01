import { isSameMonth } from "./date";
import { movementCategories, type FixedExpense, type Movement } from "../types/finance";
import { fromCents } from "./money";

export type MonthSummary = {
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalSpent: number;
  categoryData: Array<{ category: string; value: number }>;
};

export function monthSummary(
  state: { movements: Movement[]; fixedExpenses: FixedExpense[] },
  ym: string,
): MonthSummary {
  const movements = state.movements.filter((item) => isSameMonth(item.date, ym));
  const activeFixed = state.fixedExpenses.filter((item) => item.startMonth <= ym && (!item.endMonth || ym <= item.endMonth));
  const income = movements
    .filter((item) => item.type === "Ingreso")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const movementExpenses = movements
    .filter((item) => item.type === "Gasto")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const fixedCents = activeFixed.reduce((sum, item) => sum + item.amountCents, 0);
  const fixedExpenses = fromCents(fixedCents);
  const variableExpenses = movementExpenses;

  const categoryTotals = new Map<string, number>();
  for (const movement of movements) {
    if (movement.type !== "Gasto") continue;
    categoryTotals.set(movement.category, (categoryTotals.get(movement.category) ?? 0) + movement.amountCents);
  }
  for (const expense of activeFixed) {
    const category = expense.category || "Gastos fijos";
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + expense.amountCents);
  }
  const categories = [...new Set([...movementCategories, ...categoryTotals.keys()])];
  const categoryData = categories
    .map((category) => ({ category, value: fromCents(categoryTotals.get(category) ?? 0) }))
    .filter((item) => item.value > 0);

  return {
    income: fromCents(income),
    fixedExpenses,
    variableExpenses: fromCents(variableExpenses),
    totalSpent: fromCents(fixedCents + variableExpenses),
    categoryData,
  };
}
