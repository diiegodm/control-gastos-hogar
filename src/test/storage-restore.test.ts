import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/backup-v1.json";
import { configureDatabaseNameForTests, exportBackup, getAll, getItem, importBackup, migrateLegacyMarketPurchasesOnce, parseBackup, putItem, saveChecklistIds } from "../lib/db";
import type { Movement } from "../types/finance";

const localValues = new Map<string, string>();
let testDbId = 0;

vi.stubGlobal("localStorage", {
  getItem: (key: string) => localValues.get(key) ?? null,
  setItem: (key: string, value: string) => localValues.set(key, value),
  removeItem: (key: string) => localValues.delete(key),
});
vi.stubGlobal("window", { dispatchEvent: vi.fn(), setTimeout });

describe("restauración de respaldos", () => {
  beforeEach(() => {
    localValues.clear();
    configureDatabaseNameForTests(`restore-test-${++testDbId}`);
  });

  it("valida listas, importes, fechas y campos v2 antes de restaurar", () => {
    expect(() => parseBackup({ version: 1, fixedExpenses: [], products: [], purchases: [] }))
      .toThrow('El respaldo debe incluir la lista "movements".');

    const invalidAmount = structuredClone(fixture);
    invalidAmount.movements[0].amount = "abc" as unknown as number;
    expect(() => parseBackup(invalidAmount)).toThrow("movements[0].amount debe ser un número finito.");

    const invalidDate = structuredClone(fixture);
    invalidDate.movements[0].date = "2026-02-30";
    expect(() => parseBackup(invalidDate)).toThrow("movements[0].date no es una fecha válida.");

    const v2 = parseBackup(fixture);
    expect(() => parseBackup({ ...v2, movements: [{ ...v2.movements[0], amountCents: 12.5 }] }))
      .toThrow("movements[0].amountCents debe ser un entero.");
  });

  it("deja intactos los datos si la validación falla", async () => {
    const existing: Movement = {
      id: "existing-movement", date: "2026-01-03", type: "Gasto", category: "Otros",
      description: "No reemplazar", amountCents: 1900,
      createdAt: "2026-01-03T12:00:00.000Z", updatedAt: "2026-01-03T12:00:00.000Z",
    };
    await putItem("movements", existing);
    const invalidAmount = structuredClone(fixture);
    invalidAmount.movements[0].amount = "abc" as unknown as number;

    await expect(importBackup(invalidAmount)).rejects.toThrow("movements[0].amount debe ser un número finito.");
    await expect(getAll("movements")).resolves.toEqual([existing]);
  });

  it("restaura un respaldo v1 convertido a céntimos en todos los stores", async () => {
    await importBackup(fixture);
    await expect(getAll("movements")).resolves.toContainEqual(expect.objectContaining({ id: "mov-fixture-1", amountCents: 4250 }));
    await expect(getAll("movements")).resolves.toContainEqual(expect.objectContaining({ source: "market", purchaseId: "purchase-fixture-1", amountCents: 250 }));
    await expect(getAll("fixedExpenses")).resolves.toMatchObject([{ id: "fixed-fixture-1", amountCents: 3500, startMonth: "2026-01" }]);
    await expect(getAll("products")).resolves.toMatchObject([{ id: "product-fixture-1", lastUnitPriceCents: 250 }]);
    await expect(getAll("purchases")).resolves.toMatchObject([{ id: "purchase-fixture-1", totalCents: 250, unitPriceCents: 250 }]);
    await expect(getItem("spaces", "main")).resolves.toMatchObject({ state: { budgets: [{ limitCents: 15000 }], goals: [{ targetCents: 100000, savedCents: 10000 }] } });
  });

  it("recalcula el precio unitario del inventario desde la última compra por paquete", () => {
    const packagePurchase = structuredClone(fixture);
    packagePurchase.products[0].lastPrice = 6;
    packagePurchase.purchases[0].price = 6;
    packagePurchase.purchases[0].quantity = 3;
    packagePurchase.purchases[0].priceMode = "total";
    expect(parseBackup(packagePurchase).products[0].lastUnitPriceCents).toBe(200);
  });

  it("exporta e vuelve a importar un respaldo v2 completo", async () => {
    const v2 = parseBackup(fixture);
    await importBackup(v2);
    const note = { id: "note-v2", title: "Nota", body: "Contenido", createdAt: "2026-01-10T00:00:00.000Z", updatedAt: "2026-01-10T00:00:00.000Z" };
    await putItem("notes", note);
    await saveChecklistIds(["product-fixture-1"]);
    const exported = await exportBackup();
    expect(exported.version).toBe(2);
    expect(exported.notes).toEqual([note]);
    expect(exported.checklistIds).toEqual(["product-fixture-1"]);
    await importBackup(exported);
    await expect(getAll("movements")).resolves.toContainEqual(expect.objectContaining({ amountCents: 4250 }));
    await expect(getAll("notes")).resolves.toEqual([note]);
    await expect(getItem("meta", "marketChecklist")).resolves.toMatchObject({ value: ["product-fixture-1"] });
  });

  it("convierte compras históricas en movimientos una sola vez", async () => {
    await putItem("purchases", {
      id: "legacy-buy", productId: "product-fixture-1", product: "Leche", totalCents: 675,
      quantity: 3, unitPriceCents: 225, priceMode: "unit", date: "2026-01-12", createdAt: "2026-01-12T10:00:00.000Z",
    });

    await migrateLegacyMarketPurchasesOnce();
    await migrateLegacyMarketPurchasesOnce();

    await expect(getAll("movements")).resolves.toContainEqual(expect.objectContaining({
      id: "market_legacy-buy", source: "market", purchaseId: "legacy-buy", type: "Gasto", category: "Mercado", amountCents: 675,
    }));
    expect((await getAll("movements")).filter((movement) => movement.purchaseId === "legacy-buy")).toHaveLength(1);
    await expect(getItem("meta", "marketPurchaseMovementsMigrated")).resolves.toMatchObject({ value: true });
  });
});
