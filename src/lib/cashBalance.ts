import type { FixedExpense, FixedPayment, FinancialSettings, Movement } from "../types/finance";
import { currentYearMonth } from "./date";

type CashBalanceInput = {
  movements: Movement[];
  fixedPayments: FixedPayment[];
  fixedExpenses: FixedExpense[];
  settings: FinancialSettings;
  selectedMonth: string;
};

export type CashBalance = {
  trackingStarted: boolean;
  openingBalanceCents: number;
  inheritedBalanceCents: number;
  monthlyResultCents: number;
  availableBalanceCents: number | null;
  possibleDuplicatePayments: number;
};

export function matchFixedPaymentMovements(
  movements: Movement[],
  fixedPayments: FixedPayment[],
  fixedExpenses: FixedExpense[],
): { movementByPaymentId: Map<string, string>; ambiguousPaymentIds: Set<string> } {
  const expenses = new Map(fixedExpenses.map((expense) => [expense.id, expense]));
  const movementByPaymentId = new Map<string, string>();
  const ambiguousPaymentIds = new Set<string>();
  const usedMovementIds = new Set<string>();
  for (const payment of fixedPayments) {
    if (!payment.movementId) continue;
    movementByPaymentId.set(payment.id, payment.movementId);
    usedMovementIds.add(payment.movementId);
  }
  const normalize = (value: string) => value.trim().toLocaleLowerCase("es-ES").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  for (const payment of fixedPayments) {
    if (payment.movementId) continue;
    const expense = expenses.get(payment.expenseId);
    if (!expense) continue;
    const matches = movements.filter((movement) =>
      movement.type === "Gasto" && movement.date.startsWith(payment.month) && movement.amountCents === payment.amountCents
      && normalize(movement.description) === normalize(expense.concept)
      && (!expense.category || movement.category === expense.category)
      && !movement.fixedPaymentId && !usedMovementIds.has(movement.id),
    );
    if (matches.length === 1) {
      movementByPaymentId.set(payment.id, matches[0].id);
      usedMovementIds.add(matches[0].id);
    } else if (matches.length > 1) {
      ambiguousPaymentIds.add(payment.id);
    }
  }
  return { movementByPaymentId, ambiguousPaymentIds };
}

export function defaultFinancialSettings(movements: Movement[], fixedPayments: FixedPayment[]): FinancialSettings {
  const months = [
    ...movements.map((movement) => movement.date.slice(0, 7)),
    ...fixedPayments.map((payment) => payment.month),
  ].filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month));
  return { openingBalanceCents: 0, trackingStartMonth: months.sort()[0] ?? currentYearMonth() };
}

export function resolveFinancialSettings(raw: unknown, movements: Movement[], fixedPayments: FixedPayment[]): FinancialSettings {
  const fallback = defaultFinancialSettings(movements, fixedPayments);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const candidate = raw as Partial<FinancialSettings>;
  if (!Number.isSafeInteger(candidate.openingBalanceCents) || typeof candidate.trackingStartMonth !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(candidate.trackingStartMonth)) return fallback;
  return { openingBalanceCents: candidate.openingBalanceCents as number, trackingStartMonth: candidate.trackingStartMonth };
}

function monthIndex(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return year * 12 + monthNumber - 1;
}

function monthResult(movements: Movement[], fixedPayments: FixedPayment[], fixedExpenses: FixedExpense[], month: string): { resultCents: number; ambiguousCount: number } {
  const entries = movements.filter((item) => item.date.startsWith(month));
  const income = entries
    .filter((item) => item.type === "Ingreso")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const expenses = entries
    .filter((item) => item.type === "Gasto")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const matches = matchFixedPaymentMovements(movements, fixedPayments.filter((payment) => payment.month === month), fixedExpenses);
  const movementIds = new Set(entries.map((item) => item.id));
  const unlinkedFixedPayments = fixedPayments
    .filter((payment) => payment.month === month && !movementIds.has(matches.movementByPaymentId.get(payment.id) ?? payment.movementId ?? ""))
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return { resultCents: income - expenses - unlinkedFixedPayments, ambiguousCount: matches.ambiguousPaymentIds.size };
}

export function calculateCashBalance(input: CashBalanceInput): CashBalance {
  const { movements, fixedPayments, fixedExpenses, settings, selectedMonth } = input;
  const selectedIndex = monthIndex(selectedMonth);
  const startIndex = monthIndex(settings.trackingStartMonth);
  const selectedMonthResult = monthResult(movements, fixedPayments, fixedExpenses, selectedMonth);
  const selectedResult = selectedMonthResult.resultCents;

  if (selectedIndex < startIndex) {
    return {
      trackingStarted: false,
      openingBalanceCents: settings.openingBalanceCents,
      inheritedBalanceCents: 0,
      monthlyResultCents: selectedResult,
      availableBalanceCents: null,
      possibleDuplicatePayments: selectedMonthResult.ambiguousCount,
    };
  }

  let inheritedBalanceCents = settings.openingBalanceCents;
  let possibleDuplicatePayments = 0;
  for (let index = startIndex; index < selectedIndex; index += 1) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const currentMonth = `${year}-${String(month).padStart(2, "0")}`;
    const result = monthResult(movements, fixedPayments, fixedExpenses, currentMonth);
    inheritedBalanceCents += result.resultCents;
    possibleDuplicatePayments += result.ambiguousCount;
  }
  possibleDuplicatePayments += selectedMonthResult.ambiguousCount;

  return {
    trackingStarted: true,
    openingBalanceCents: settings.openingBalanceCents,
    inheritedBalanceCents,
    monthlyResultCents: selectedResult,
    availableBalanceCents: inheritedBalanceCents + selectedResult,
    possibleDuplicatePayments,
  };
}
