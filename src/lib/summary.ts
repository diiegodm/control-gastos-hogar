import { isSameMonth } from "./date";
import { movementCategories, type FixedExpense, type FixedPayment, type Movement } from "../types/finance";
import { fromCents } from "./money";
import { matchFixedPaymentMovements } from "./cashBalance";

export type MonthSummary = {
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalSpent: number;
  categoryData: Array<{ category: string; value: number }>;
};

export function monthSummary(
  state: { movements: Movement[]; fixedExpenses: FixedExpense[]; fixedPayments?: FixedPayment[] },
  ym: string,
): MonthSummary {
  const movements = state.movements.filter((item) => isSameMonth(item.date, ym));
  const fixedPayments = (state.fixedPayments ?? []).filter((item) => item.month === ym);
  const fixedExpenseById = new Map(state.fixedExpenses.map((item) => [item.id, item]));
  const income = movements
    .filter((item) => item.type === "Ingreso")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const linkedMovementIds = new Set(matchFixedPaymentMovements(movements, fixedPayments, state.fixedExpenses).movementByPaymentId.values());
  const movementExpenses = movements
    .filter((item) => item.type === "Gasto" && !linkedMovementIds.has(item.id))
    .reduce((sum, item) => sum + item.amountCents, 0);
  const fixedCents = fixedPayments.reduce((sum, item) => sum + item.amountCents, 0);
  const fixedExpenses = fromCents(fixedCents);
  const variableExpenses = movementExpenses;

  const categoryTotals = new Map<string, number>();
  for (const movement of movements) {
    if (movement.type !== "Gasto" || linkedMovementIds.has(movement.id)) continue;
    categoryTotals.set(movement.category, (categoryTotals.get(movement.category) ?? 0) + movement.amountCents);
  }
  for (const payment of fixedPayments) {
    const expense = fixedExpenseById.get(payment.expenseId);
    const category = expense?.category || "Gastos fijos";
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + payment.amountCents);
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
