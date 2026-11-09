import { describe, expect, it } from "vitest";
import { parseReceiptText, ticketLinesMismatch } from "../lib/receiptParser";

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
});
