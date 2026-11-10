import type { FixedExpense } from "../types/finance";
import type { BudgetSpace, GoalSpace } from "../types/spaces";
import type { FinancialAlert } from "../types/notifications";
import { currency } from "./money";

type UpcomingPayment = FixedExpense & { dueDateForSelectedMonth: string; daysRemaining: number; isPaid: boolean };

export function buildFinancialAlerts(input: {
  month: string;
  today: string;
  budgets: BudgetSpace[];
  goals: GoalSpace[];
  categorySpending: Array<{ category: string; value: number }>;
  currentMonthSpentCents?: number;
  previousMonthSpentCents?: number;
  upcomingPayments: UpcomingPayment[];
}): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  const seenCategories = new Set<string>();

  for (const budget of input.budgets) {
    if (budget.archived || budget.limitCents <= 0 || seenCategories.has(budget.category)) continue;
    seenCategories.add(budget.category);
    const spentCents = Math.round((input.categorySpending.find((item) => item.category === budget.category)?.value ?? 0) * 100);
    const percent = spentCents / budget.limitCents;
    if (percent >= 1) {
      alerts.push({
        id: `budget:exceeded:${input.month}:${budget.id}`,
        kind: "budget",
        level: "critical",
        title: `Presupuesto de ${budget.category} superado`,
        message: `Llevas ${currency(spentCents / 100)} frente a un límite de ${currency(budget.limitCents / 100)}.`,
        createdAt: `${input.today}T12:00:00.000Z`,
      });
    } else if (percent >= 0.8) {
      alerts.push({
        id: `budget:near:${input.month}:${budget.id}`,
        kind: "budget",
        level: "warning",
        title: `Presupuesto de ${budget.category} casi agotado`,
        message: `Te quedan ${currency((budget.limitCents - spentCents) / 100)} de ${currency(budget.limitCents / 100)}.`,
        createdAt: `${input.today}T12:00:00.000Z`,
      });
    }
  }

  for (const goal of input.goals) {
    if (goal.archived || goal.targetCents <= 0) continue;
    const progress = goal.savedCents / goal.targetCents;
    if (progress >= 1) {
      alerts.push({
        id: `goal:reached:${goal.id}:${goal.targetCents}`,
        kind: "goal",
        level: "info",
        title: `¡Objetivo alcanzado: ${goal.name}!`,
        message: `Has reunido ${currency(goal.savedCents / 100)} para esta meta.`,
        createdAt: `${input.today}T12:00:00.000Z`,
      });
    } else if (progress >= 0.8) {
      alerts.push({
        id: `goal:near:${goal.id}:${goal.targetCents}`,
        kind: "goal",
        level: "info",
        title: `Estás cerca de ${goal.name}`,
        message: `Te faltan ${currency((goal.targetCents - goal.savedCents) / 100)} para completar tu objetivo.`,
        createdAt: `${input.today}T12:00:00.000Z`,
      });
    }
  }

  for (const payment of input.upcomingPayments) {
    if (payment.isPaid || payment.daysRemaining > 5) continue;
    const overdue = payment.daysRemaining < 0;
    const timing = overdue ? "está vencido" : payment.daysRemaining === 0 ? "vence hoy" : `vence en ${payment.daysRemaining} ${payment.daysRemaining === 1 ? "día" : "días"}`;
    alerts.push({
      id: `payment:${payment.id}:${payment.dueDateForSelectedMonth}`,
      kind: "payment",
      level: overdue || payment.daysRemaining <= 1 ? "critical" : "warning",
      title: overdue ? `Pago vencido: ${payment.concept}` : `Próximo pago: ${payment.concept}`,
      message: `${timing} · ${currency(payment.amountCents / 100)}.`,
      createdAt: `${input.today}T12:00:00.000Z`,
    });
  }

  const elapsedDays = Number(input.today.slice(8, 10));
  const daysInMonth = new Date(Number(input.today.slice(0, 4)), Number(input.today.slice(5, 7)), 0).getDate();
  const currentSpent = input.currentMonthSpentCents ?? 0;
  const previousSpent = input.previousMonthSpentCents ?? 0;
  const projectedSpend = elapsedDays >= 10 ? Math.round(currentSpent / elapsedDays * daysInMonth) : 0;
  if (previousSpent > 0 && projectedSpend >= previousSpent * 1.2) {
    const increasePercent = Math.round((projectedSpend / previousSpent - 1) * 100);
    alerts.push({
      id: `spending:trend:${input.month}`,
      kind: "spending",
      level: "warning",
      title: "El gasto va por encima del mes pasado",
      message: `Al ritmo actual, podrías cerrar con ${currency(projectedSpend / 100)} frente a ${currency(previousSpent / 100)} el mes anterior (+${increasePercent} %).`,
      createdAt: `${input.today}T12:00:00.000Z`,
    });
  }

  return alerts;
}
