import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/backup-v1.json";
import { clearStore, getAll, importBackup, parseBackup, putItem } from "../lib/storage";

const localValues = new Map<string, string>();
let failLocalStorageWrite = false;

vi.stubGlobal("localStorage", {
  getItem: (key: string) => localValues.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (failLocalStorageWrite) throw new Error("QuotaExceededError");
    localValues.set(key, value);
  },
  removeItem: (key: string) => localValues.delete(key),
});
vi.stubGlobal("window", { dispatchEvent: vi.fn(), setTimeout });

describe("restauración de respaldos", () => {
  beforeEach(async () => {
    failLocalStorageWrite = false;
    localValues.clear();
    await Promise.all([
      clearStore("movements"),
      clearStore("fixedExpenses"),
      clearStore("products"),
      clearStore("purchases"),
    ]);
  });

  it("valida arrays requeridos, tipos numéricos y fechas antes de restaurar", () => {
    expect(() => parseBackup({ version: 1, fixedExpenses: [], products: [], purchases: [] }))
      .toThrow('El respaldo debe incluir la lista "movements".');

    const invalidAmount = structuredClone(fixture);
    invalidAmount.movements[0].amount = "abc" as unknown as number;
    expect(() => parseBackup(invalidAmount)).toThrow("movements[0].amount debe ser un número finito.");

    const invalidDate = structuredClone(fixture);
    invalidDate.movements[0].date = "2026-02-30";
    expect(() => parseBackup(invalidDate)).toThrow("movements[0].date no es una fecha válida.");
  });

  it("deja intactos los datos si el respaldo no valida", async () => {
    const existing = {
      id: "existing-movement",
      date: "2026-01-03",
      type: "Gasto" as const,
      category: "Otros",
      description: "No reemplazar",
      amount: 19,
      createdAt: "2026-01-03T12:00:00.000Z",
      updatedAt: "2026-01-03T12:00:00.000Z",
    };
    await putItem("movements", existing);

    await expect(importBackup({ version: 1, fixedExpenses: [], products: [], purchases: [] }))
      .rejects.toThrow('El respaldo debe incluir la lista "movements".');
    await expect(getAll("movements")).resolves.toEqual([existing]);

    const invalidAmount = structuredClone(fixture);
    invalidAmount.movements[0].amount = "abc" as unknown as number;
    await expect(importBackup(invalidAmount)).rejects.toThrow("movements[0].amount debe ser un número finito.");
    await expect(getAll("movements")).resolves.toEqual([existing]);
  });

  it("reemplaza los cuatro almacenes y los espacios tras una transacción válida", async () => {
    await importBackup(fixture);
    await expect(getAll("movements")).resolves.toEqual(fixture.movements);
    await expect(getAll("fixedExpenses")).resolves.toEqual(fixture.fixedExpenses);
    await expect(getAll("products")).resolves.toEqual(fixture.products);
    await expect(getAll("purchases")).resolves.toEqual(fixture.purchases);
    expect(JSON.parse(localValues.get("finanzas-hogar-spaces-v1") ?? "null")).toEqual(fixture.spaces);
  });

  it("revierte IndexedDB si falla la escritura de spaces", async () => {
    const existing = {
      id: "existing-movement",
      date: "2026-01-03",
      type: "Gasto" as const,
      category: "Otros",
      description: "Conservar si falla localStorage",
      amount: 19,
      createdAt: "2026-01-03T12:00:00.000Z",
      updatedAt: "2026-01-03T12:00:00.000Z",
    };
    await putItem("movements", existing);
    failLocalStorageWrite = true;

    await expect(importBackup(fixture)).rejects.toThrow("Se restauraron los datos anteriores.");
    await expect(getAll("movements")).resolves.toEqual([existing]);
  });
});
