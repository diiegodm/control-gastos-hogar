import type { MonthKey } from "../types";

export const MONTHS: MonthKey[] = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function monthFromIso(date: string): MonthKey {
  const parsed = new Date(`${date}T00:00:00`);
  return MONTHS[parsed.getMonth()];
}

export function currentMonth(): MonthKey {
  return MONTHS[new Date().getMonth()];
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function daysUntil(date: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(`${date}T00:00:00`);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

export function paymentTone(days: number) {
  if (days < 5) return "danger";
  if (days <= 10) return "warning";
  return "ok";
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}
