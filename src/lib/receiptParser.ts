import type { ProductCategory, ReceiptLine } from "../types/finance";

export type ParsedReceipt = {
  storeName: string;
  date: string;
  subtotalCents?: number;
  taxCents?: number;
  totalCents?: number;
  lines: ReceiptLine[];
  warnings: string[];
};

function amountCents(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (!/\d/.test(cleaned)) return undefined;
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    normalized = cleaned.replace(/[,.]/g, (separator) => separator === decimal ? "." : "");
  } else if (comma >= 0) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if ((cleaned.match(/\./g) ?? []).length > 1) normalized = cleaned.replace(/\./g, "");
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : undefined;
}

function toISODate(raw: string): string | undefined {
  const match = raw.match(/\b(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})\b/);
  if (!match) return undefined;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseReceiptText(text: string, today = new Date().toISOString().slice(0, 10)): ParsedReceipt {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const warnings: string[] = [];
  const totalLine = lines.find((line) => /\b(total|importe total|a pagar|total €)\b/i.test(line));
  const subtotalLine = lines.find((line) => /\b(subtotal|base imponible)\b/i.test(line));
  const taxLine = lines.find((line) => /\b(iva|impuesto)\b/i.test(line));
  const lastAmount = (line?: string) => {
    if (!line) return undefined;
    const matches = [...line.matchAll(/(?:€\s*)?\d[\d.,]*\d|\d/g)];
    return matches.length ? amountCents(matches[matches.length - 1][0]) : undefined;
  };
  const totalCents = lastAmount(totalLine);
  const subtotalCents = lastAmount(subtotalLine);
  const taxCents = lastAmount(taxLine);
  const date = lines.map(toISODate).find((value) => value !== undefined) ?? today;
  const ignored = /\b(total|subtotal|base imponible|iva|impuesto|tarjeta|efectivo|cambio|vuelto|gracias|cajero|terminal|fecha|hora|ticket|factura|descuento)\b/i;
  const parsedItems: ReceiptLine[] = [];

  for (const [index, line] of lines.entries()) {
    if (ignored.test(line) || !/\d/.test(line)) continue;
    const numbers = [...line.matchAll(/\d+[.,]?\d*/g)];
    if (!numbers.length) continue;
    const last = numbers[numbers.length - 1];
    const total = amountCents(last[0]);
    if (total === undefined || total <= 0) continue;
    const beforeTotal = line.slice(0, last.index).replace(/[€*\s]+$/g, "").trim();
    const quantityMatch = beforeTotal.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*[x×]\s*/i);
    const quantity = quantityMatch ? Number(quantityMatch[1].replace(",", ".")) : 1;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    let description = quantityMatch
      ? quantityMatch.index === 0
        ? beforeTotal.slice(quantityMatch[0].length).replace(/\s+\d+[.,]\d+\s*$/, "").trim()
        : beforeTotal.slice(0, quantityMatch.index).trim()
      : beforeTotal;
    if (description.length < 2 || !/[a-záéíóúñ]/i.test(description)) continue;
    parsedItems.push({
      id: `line_${index}`,
      description,
      quantity,
      unitPriceCents: Math.round(total / quantity),
      totalCents: total,
      inventoryAction: "ignore",
      category: "Despensa" as ProductCategory,
    });
  }

  if (totalCents === undefined) warnings.push("No se detectó con seguridad el total del ticket. Revísalo antes de guardar.");
  if (parsedItems.length === 0) warnings.push("No se detectaron productos con suficiente claridad. Puedes añadirlos manualmente.");
  const storeName = lines.find((line) => /[a-záéíóúñ]{3}/i.test(line) && !ignored.test(line) && !toISODate(line)) ?? "Comercio";
  return { storeName: storeName.slice(0, 80), date, subtotalCents, taxCents, totalCents, lines: parsedItems, warnings };
}

export function ticketLinesMismatch(lines: ReceiptLine[], totalCents: number): boolean {
  return Math.abs(lines.reduce((sum, line) => sum + line.totalCents, 0) - totalCents) > 1;
}
