import type { ProductCategory, ReceiptLine } from "../types/finance";

export type ParsedReceipt = {
  storeName: string;
  date: string;
  subtotalCents?: number;
  taxCents?: number;
  discountCents?: number;
  totalCents?: number;
  lines: ReceiptLine[];
  warnings: string[];
};

export type ReceiptTextLine = {
  text: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

type NumberToken = { text: string; start: number; end: number; cents?: number };

function moneyCents(raw: string): number | undefined {
  let value = raw.replace(/[^\d,.\-−]/g, "").replace("−", "-");
  const negative = value.startsWith("-");
  value = value.replace(/-/g, "");
  if (!value || !/\d/.test(value)) return undefined;

  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  let decimalAt = -1;
  if (comma >= 0 && dot >= 0) decimalAt = Math.max(comma, dot);
  else {
    const separator = comma >= 0 ? "," : dot >= 0 ? "." : "";
    if (separator) {
      const index = value.lastIndexOf(separator);
      const decimals = value.length - index - 1;
      const occurrences = [...value].filter((item) => item === separator).length;
      if (occurrences > 1 || decimals === 3) decimalAt = -1;
      else decimalAt = index;
    }
  }

  const integerText = (decimalAt < 0 ? value : value.slice(0, decimalAt)).replace(/[,.]/g, "") || "0";
  const fractionText = decimalAt < 0 ? "" : value.slice(decimalAt + 1).replace(/[,.]/g, "");
  if (!/^\d+$/.test(integerText) || (fractionText && !/^\d+$/.test(fractionText))) return undefined;

  try {
    let cents = BigInt(integerText) * 100n + BigInt(fractionText.padEnd(2, "0").slice(0, 2) || "0");
    if (fractionText.length > 2 && Number(fractionText[2]) >= 5) cents += 1n;
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
    const result = Number(cents);
    return negative ? -result : result;
  } catch {
    return undefined;
  }
}

function numericTokens(line: string): NumberToken[] {
  return [...line.matchAll(/[−-]?\d+(?:[.,]\d+)*/g)].map((match) => ({
    text: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    cents: moneyCents(match[0]),
  }));
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

function normalizeLine(value: string): string {
  return value.trim().toLocaleLowerCase("es-ES").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function quantityMarker(line: string): RegExpMatchArray | null {
  const explicit = [...line.matchAll(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:[x×]|uds?\.?|unid(?:ad(?:es)?)?\.?|kg|g|l|ml)(?![a-z])/gi)];
  return explicit.length ? explicit[explicit.length - 1] : null;
}

function confidenceFor(line: string, metadata: Map<string, ReceiptTextLine[]>): number | undefined {
  const matches = metadata.get(normalizeLine(line));
  return matches?.shift()?.confidence;
}

function cleanDescriptionNoise(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  while (words.length > 1) {
    const token = words[0];
    if (/^[^\p{L}\p{N}]+$/u.test(token)) {
      words.shift();
      continue;
    }
    if (/^[A-ZÁÉÍÓÚÑ]\.$/u.test(token)) break;
    const letters = token.match(/\p{L}/gu) ?? [];
    const nextLetter = words[1].match(/\p{L}/u)?.[0];
    const isUppercaseInitial = letters.length === 1
      && letters[0] === letters[0].toLocaleUpperCase("es-ES")
      && nextLetter !== undefined
      && nextLetter === nextLetter.toLocaleUpperCase("es-ES");
    if (letters.length === 1 && !isUppercaseInitial) {
      words.shift();
      continue;
    }
    break;
  }
  return words.join(" ").replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N})]+$/u, "").trim();
}

function productHeaderIndex(lines: string[]): number {
  for (let index = 0; index < lines.length; index += 1) {
    const headerText = normalizeLine(lines.slice(index, index + 3).join(" "));
    if (/\b(descripcion|producto|articulo)\b/.test(headerText) && /\b(precio|importe|p unit|unitario)\b/.test(headerText)) {
      return index;
    }
  }
  return -1;
}

export function parseReceiptText(
  text: string,
  today = new Date().toISOString().slice(0, 10),
  ocrLines: ReceiptTextLine[] = [],
): ParsedReceipt {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const warnings: string[] = [];
  const metadata = new Map<string, ReceiptTextLine[]>();
  for (const line of ocrLines) {
    const key = normalizeLine(line.text);
    if (!metadata.has(key)) metadata.set(key, []);
    metadata.get(key)!.push(line);
  }

  const totalLineIndex = lines.findIndex((line) => /\b(total|importe total|a pagar|total €)\b/i.test(line));
  const totalLine = totalLineIndex < 0 ? undefined : lines[totalLineIndex];
  const headerIndex = productHeaderIndex(lines);
  const subtotalLine = lines.find((line) => /\b(subtotal|base imponible)\b/i.test(line));
  const taxLine = lines.find((line) => /\b(iva|impuesto)\b/i.test(line));
  const finalCents = (line?: string) => {
    if (!line) return undefined;
    const amounts = numericTokens(line).filter((token) => token.cents !== undefined);
    return amounts.length ? amounts[amounts.length - 1].cents : undefined;
  };
  const totalCents = finalCents(totalLine);
  const subtotalCents = finalCents(subtotalLine);
  const taxCents = finalCents(taxLine);
  let discountCents: number | undefined;
  const detectedDate = lines.map(toISODate).find((value) => value !== undefined);
  const date = detectedDate ?? today;
  const ignored = /\b(total|subtotal|base imponible|iva|impuesto|tarjeta|efectivo|contado|pago|pagado|cambio|vuelto|gracias|cajero|terminal|fecha|hora|ticket|pre[- ]?ticket|factura|entregado|devolucion|devolución|mesa|comensal(?:es)?|descripcion|descripción|precio|importe|cantidad)\b/i;
  const parsedItems: ReceiptLine[] = [];

  for (const [index, line] of lines.entries()) {
    if (headerIndex >= 0 && index <= headerIndex) continue;
    if (totalLineIndex >= 0 && index >= totalLineIndex) continue;
    const tokens = numericTokens(line);
    const amounts = tokens.filter((token) => token.cents !== undefined);
    if (/\b(descuento|promo(?:cion)?|oferta)\b/i.test(line)) {
      const amount = amounts.length ? amounts[amounts.length - 1].cents : undefined;
      if (amount !== undefined && amount !== 0) discountCents = (discountCents ?? 0) + Math.abs(amount);
      continue;
    }
    if (ignored.test(line) || toISODate(line) || !amounts.length || !/[a-záéíóúñ]/i.test(line)) continue;

    const totalToken = amounts[amounts.length - 1];
    if (totalToken.cents === undefined || totalToken.cents <= 0) continue;
    const beforeTotal = line.slice(0, totalToken.start).trim();
    const marker = quantityMarker(beforeTotal);
    const leadingQuantity = !marker ? beforeTotal.match(/^(\d+(?:[.,]\d+)?)\s*[.)\]:-]?\s+(?=[A-Za-zÁÉÍÓÚÑ])/u) : null;
    const quantityText = marker?.[1] ?? leadingQuantity?.[1];
    const quantity = quantityText ? Number(quantityText.replace(",", ".")) : 1;
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) continue;

    const rawDescription = (marker ? beforeTotal.slice(0, marker.index ?? 0) : leadingQuantity ? beforeTotal.slice(leadingQuantity[0].length) : beforeTotal)
      .replace(/[\s:;=|·*€]+$/g, "")
      .trim();
    const description = cleanDescriptionNoise(rawDescription);
    if (description.length < 2 || !/[a-záéíóúñ]/i.test(description)) continue;

    const markerEnd = marker ? (marker.index ?? 0) + marker[0].length : -1;
    const unitToken = marker
      ? amounts.find((token) => token.start >= markerEnd && token.start < totalToken.start)
      : undefined;
    const unitPriceCents = quantity === 1
      ? totalToken.cents
      : unitToken?.cents !== undefined && unitToken.cents > 0
        ? unitToken.cents
        : Math.round(totalToken.cents / quantity);
    const ocrConfidence = confidenceFor(line, metadata);
    const structuralUncertainty = quantity > 1 && !unitToken;
    const suspiciousDescription = /[^\p{L}\p{N}\s.,()&/+’'-]/u.test(description);
    const descriptionAdjusted = description !== rawDescription;
    parsedItems.push({
      id: `line_${index}`,
      description,
      quantity,
      unitPriceCents,
      totalCents: totalToken.cents,
      inventoryAction: "create",
      category: "Despensa" as ProductCategory,
      ...(ocrConfidence === undefined ? {} : { ocrConfidence: Math.max(0, Math.min(100, Math.round(ocrConfidence))) }),
      ...(ocrConfidence !== undefined && ocrConfidence < 75 || structuralUncertainty || suspiciousDescription || descriptionAdjusted ? { reviewRequired: true } : {}),
    });
  }

  const linesMismatch = totalCents !== undefined && ticketLinesMismatch(parsedItems, totalCents, discountCents ?? 0);
  if (linesMismatch) {
    for (const item of parsedItems) item.reviewRequired = true;
  }
  if (totalCents === undefined) warnings.push("No se detectó con seguridad el total del ticket. Revísalo antes de guardar.");
  if (!detectedDate) warnings.push("No se detectó la fecha del ticket. Comprueba la fecha propuesta antes de confirmar.");
  if (parsedItems.length === 0) warnings.push("No se detectaron productos con suficiente claridad. Puedes añadirlos manualmente.");
  if (parsedItems.some((item) => item.reviewRequired)) warnings.push("Hay productos dudosos. Revisa las cantidades e importes marcados antes de confirmar.");
  if (subtotalCents !== undefined && taxCents !== undefined && totalCents !== undefined && discountCents === undefined
    && Math.abs(subtotalCents + taxCents - totalCents) > 1) {
    warnings.push("Subtotal e impuestos no coinciden con el total reconocido. Comprueba el ticket antes de confirmar.");
  }
  if (linesMismatch) {
    warnings.push("La suma de productos menos descuentos no coincide con el total. Comprueba los importes; no se ajustarán automáticamente.");
  }
  const storeName = lines.find((line) => /[a-záéíóúñ]{3}/i.test(line) && !ignored.test(line) && !/\b(descuento|promo(?:cion)?|oferta)\b/i.test(line) && !toISODate(line)) ?? "Comercio";
  return { storeName: storeName.slice(0, 80), date, subtotalCents, taxCents, discountCents, totalCents, lines: parsedItems, warnings };
}

export function ticketLinesMismatch(lines: ReceiptLine[], totalCents: number, discountCents = 0): boolean {
  return Math.abs(lines.reduce((sum, line) => sum + line.totalCents, 0) - discountCents - totalCents) > 1;
}

export function receiptLineAmountMismatch(line: Pick<ReceiptLine, "quantity" | "unitPriceCents" | "totalCents">): boolean {
  return !Number.isFinite(line.quantity) || line.quantity <= 0
    || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0
    || !Number.isSafeInteger(line.totalCents) || line.totalCents < 0
    || Math.abs(Math.round(line.quantity * line.unitPriceCents) - line.totalCents) > 1;
}
