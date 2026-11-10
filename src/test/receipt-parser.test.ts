import { describe, expect, it } from "vitest";
import { parseReceiptText, receiptLineAmountMismatch, ticketLinesMismatch } from "../lib/receiptParser";

describe("lectura de datos de ticket", () => {
  it("extrae comercio, fecha, líneas y total en formato español", () => {
    const receipt = parseReceiptText("MERCADO SOL\n09/11/2026\nLeche 1,25\nSalsa tomate 3 x 2,00 6,00\nIVA 1,19\nTOTAL 8,44", "2026-11-09");
    expect(receipt.storeName).toBe("MERCADO SOL");
    expect(receipt.date).toBe("2026-11-09");
    expect(receipt.totalCents).toBe(844);
    expect(receipt.taxCents).toBe(119);
    expect(receipt.lines.map(({ description, quantity, totalCents }) => ({ description, quantity, totalCents }))).toEqual([
      { description: "Leche", quantity: 1, totalCents: 125 },
      { description: "Salsa tomate", quantity: 3, totalCents: 600 },
    ]);
    expect(receipt.lines.map(({ inventoryAction }) => inventoryAction)).toEqual(["create", "create"]);
  });

  it("separa cantidad, nombre e importe en filas con unidades y peso", () => {
    const receipt = parseReceiptText([
      "MERCADONA",
      "Leche entera Hacendado 1 L 6 ud 0,96 € 5,76 €",
      "Pechuga de pollo fileteada 0,620 kg 6,25 €/kg 3,88 €",
      "Huevos M (12 uds) 1 ud 2,35 € 2,35 €",
      "Patatas bolsa 2,5 kg 1 ud 2,99 € 2,99 €",
      "TOTAL 14,98 €",
    ].join("\n"), "2026-11-10");

    expect(receipt.lines.map(({ description, quantity, totalCents }) => ({ description, quantity, totalCents }))).toEqual([
      { description: "Leche entera Hacendado 1 L", quantity: 6, totalCents: 576 },
      { description: "Pechuga de pollo fileteada", quantity: 0.62, totalCents: 388 },
      { description: "Huevos M (12 uds)", quantity: 1, totalCents: 235 },
      { description: "Patatas bolsa 2,5 kg", quantity: 1, totalCents: 299 },
    ]);
  });

  it("avisa si el OCR no encuentra el importe y permite revisar la diferencia", () => {
    const receipt = parseReceiptText("TIENDA\nGalletas 1,20", "2026-11-09");
    expect(receipt.totalCents).toBeUndefined();
    expect(receipt.warnings).toContain("No se detectó con seguridad el total del ticket. Revísalo antes de guardar.");
    expect(ticketLinesMismatch(receipt.lines, 125)).toBe(true);
    expect(ticketLinesMismatch(receipt.lines, 120)).toBe(false);
  });

  it("reconoce el ticket de referencia Hiper Kyra y no convierte el cambio en producto", () => {
    const receipt = parseReceiptText([
      "HIPER KYRA",
      "01/11/2026",
      "Marcador permanente: 1 × 1,95 € = 1,95 €",
      "Cinta de pintor: 8 × 0,75 € = 6,00 €",
      "Cambio 0,05 €",
      "TOTAL 7,95 €",
    ].join("\n"), "2026-11-01");

    expect(receipt.lines.map(({ description, quantity, unitPriceCents, totalCents }) => ({ description, quantity, unitPriceCents, totalCents }))).toEqual([
      { description: "Marcador permanente", quantity: 1, unitPriceCents: 195, totalCents: 195 },
      { description: "Cinta de pintor", quantity: 8, unitPriceCents: 75, totalCents: 600 },
    ]);
    expect(receipt.totalCents).toBe(795);
    expect(ticketLinesMismatch(receipt.lines, 795)).toBe(false);
  });

  it("reconoce unidades por peso, subtotal, IVA y descuentos sin alterar el total", () => {
    const receipt = parseReceiptText([
      "SUPERMERCADO",
      "Pechuga de pollo 0,620 kg 6,25 €/kg 3,88 €",
      "Arroz 2 uds 1,50 € 3,00 €",
      "Descuento promoción -0,50 €",
      "Subtotal 6,38 €",
      "IVA 0,50 €",
      "TOTAL 6,38 €",
    ].join("\n"), "2026-11-01");

    expect(receipt.lines.map(({ description, quantity, unitPriceCents, totalCents }) => ({ description, quantity, unitPriceCents, totalCents }))).toEqual([
      { description: "Pechuga de pollo", quantity: 0.62, unitPriceCents: 625, totalCents: 388 },
      { description: "Arroz", quantity: 2, unitPriceCents: 150, totalCents: 300 },
    ]);
    expect(receipt.discountCents).toBe(50);
    expect(receipt.subtotalCents).toBe(638);
    expect(receipt.taxCents).toBe(50);
    expect(receipt.totalCents).toBe(638);
    expect(ticketLinesMismatch(receipt.lines, 638, 50)).toBe(false);
  });

  it("señala líneas con baja confianza y no cuadra valores incoherentes", () => {
    const receipt = parseReceiptText("TIENDA\nLeche 2 uds 0,90 € 1,99 €\nTOTAL 1,99 €", "2026-11-01", [
      { text: "Leche 2 uds 0,90 € 1,99 €", confidence: 32, bbox: { x0: 5, y0: 10, x1: 200, y1: 28 } },
    ]);
    expect(receipt.lines[0]).toMatchObject({ ocrConfidence: 32, reviewRequired: true });
    expect(receipt.warnings).toContain("Hay productos dudosos. Revisa las cantidades e importes marcados antes de confirmar.");
    expect(receiptLineAmountMismatch(receipt.lines[0])).toBe(true);
    expect(receipt.totalCents).toBe(199);
  });
});
