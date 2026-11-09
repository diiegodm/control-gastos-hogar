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
  });

  it("avisa si el OCR no encuentra el importe y permite revisar la diferencia", () => {
    const receipt = parseReceiptText("TIENDA\nGalletas 1,20", "2026-11-09");
    expect(receipt.totalCents).toBeUndefined();
    expect(receipt.warnings).toContain("No se detectó con seguridad el total del ticket. Revísalo antes de guardar.");
    expect(ticketLinesMismatch(receipt.lines, 125)).toBe(true);
    expect(ticketLinesMismatch(receipt.lines, 120)).toBe(false);
  });
});
