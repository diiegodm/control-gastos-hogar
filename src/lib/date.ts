import type { MonthOption } from "../types/finance";

export const months: MonthOption[] = [
  { value: 0, label: "Enero", shortLabel: "Ene" },
  { value: 1, label: "Febrero", shortLabel: "Feb" },
  { value: 2, label: "Marzo", shortLabel: "Mar" },
  { value: 3, label: "Abril", shortLabel: "Abr" },
  { value: 4, label: "Mayo", shortLabel: "May" },
  { value: 5, label: "Junio", shortLabel: "Jun" },
  { value: 6, label: "Julio", shortLabel: "Jul" },
  { value: 7, label: "Agosto", shortLabel: "Ago" },
  { value: 8, label: "Septiembre", shortLabel: "Sep" },
  { value: 9, label: "Octubre", shortLabel: "Oct" },
  { value: 10, label: "Noviembre", shortLabel: "Nov" },
  { value: 11, label: "Diciembre", shortLabel: "Dic" },
];

export const currentYear = new Date().getFullYear();

export function currentYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftYearMonth(ym: string, amount: number): string {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return currentYearMonth(date);
}

export function monthOption(ym: string): MonthOption & { year: number } {
  const [year, month] = ym.split("-").map(Number);
  const option = months[month - 1] ?? months[0];
  return { ...option, year };
}

export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isSameMonth(date: string, ym: string): boolean {
  return date.startsWith(ym);
}

export function formatDate(date: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function formatLongDate(date: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function dueDateForMonth(payDay: number, ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return toISODate(new Date(year, month - 1, Math.min(payDay, lastDay)));
}

export function daysUntil(date: string): number {
  const today = new Date(`${todayISO()}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function statusColorByDays(days: number): "green" | "yellow" | "red" {
  if (days > 10) return "green";
  if (days >= 5) return "yellow";
  return "red";
}
