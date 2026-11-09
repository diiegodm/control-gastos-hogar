import type { FixedExpense } from "../types/finance";
import type { BudgetSpace, GoalSpace } from "../types/spaces";
import { currency } from "./money";

export type MascotAdvice = {
  id: string;
  kind: "budget" | "goal" | "payment";
  message: string;
};

type UpcomingPayment = FixedExpense & { dueDateForSelectedMonth: string; daysRemaining: number; isPaid: boolean };

export function buildMascotAdvice(input: {
  budgets: BudgetSpace[];
  goals: GoalSpace[];
  categorySpending: Array<{ category: string; value: number }>;
  upcomingPayments: UpcomingPayment[];
}): MascotAdvice[] {
  const advice: MascotAdvice[] = [];
  const seenBudgetCategories = new Set<string>();

  for (const budget of input.budgets) {
    if (budget.archived || seenBudgetCategories.has(budget.category)) continue;
    seenBudgetCategories.add(budget.category);
    const spentCents = Math.round((input.categorySpending.find((item) => item.category === budget.category)?.value ?? 0) * 100);
    const remainingCents = budget.limitCents - spentCents;
    const usagePercent = budget.limitCents > 0 ? spentCents / budget.limitCents : 0;
    if (remainingCents < 0) {
      advice.push({ id: `budget:${budget.id}`, kind: "budget", message: `${budget.category}: el gasto registrado supera el límite por ${currency(Math.abs(remainingCents) / 100)}.` });
    } else if (usagePercent >= 0.75) {
      advice.push({ id: `budget:${budget.id}`, kind: "budget", message: `Te quedan ${currency(remainingCents / 100)} en ${budget.category} (${Math.round(usagePercent * 100)} % del presupuesto utilizado).` });
    }
  }

  const nearestGoal = input.goals
    .filter((goal) => !goal.archived && goal.targetCents > 0 && goal.savedCents > 0 && goal.savedCents < goal.targetCents)
    .sort((a, b) => b.savedCents / b.targetCents - a.savedCents / a.targetCents)[0];
  if (nearestGoal) {
    advice.push({ id: `goal:${nearestGoal.id}`, kind: "goal", message: `A «${nearestGoal.name}» le faltan ${currency((nearestGoal.targetCents - nearestGoal.savedCents) / 100)} para alcanzar el objetivo.` });
  }

  const payment = input.upcomingPayments
    .filter((item) => !item.isPaid && item.daysRemaining <= 10)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  if (payment) {
    const due = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(new Date(`${payment.dueDateForSelectedMonth}T12:00:00`));
    const timing = payment.daysRemaining < 0 ? `venció el ${due}` : payment.daysRemaining === 0 ? "vence hoy" : `vence en ${payment.daysRemaining} ${payment.daysRemaining === 1 ? "día" : "días"} (${due})`;
    advice.push({ id: `payment:${payment.id}`, kind: "payment", message: `${payment.concept} ${timing}: ${currency(payment.amountCents / 100)}.` });
  }

  return advice.slice(0, 3);
}
