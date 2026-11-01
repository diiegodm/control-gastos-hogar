import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/backup-v1.json";
import { configureDatabaseNameForTests, getAll, getItem, openDb } from "../lib/db";

const values = new Map<string, string>();
const SPACES_KEY = "finanzas-hogar-spaces-v1";
const NOTES_KEY = "finanzas-hogar-notes-v1";
const CHECKLIST_KEY = "finanzas-hogar-market-checklist-v1";

vi.stubGlobal("localStorage", {
  getItem: (key: string) => values.get(key) ?? null,
  removeItem: (key: string) => values.delete(key),
});

async function seedV1(name: string, data: typeof fixture): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      for (const store of ["movements", "fixedExpenses", "products", "purchases"]) {
        request.result.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["movements", "fixedExpenses", "products", "purchases"], "readwrite");
      for (const store of ["movements", "fixedExpenses", "products", "purchases"] as const) {
        for (const item of data[store]) transaction.objectStore(store).put(item);
      }
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  });
}

describe("migración atómica IndexedDB v1 a v2", () => {
  beforeEach(() => values.clear());

  it("migra el fixture, espacios, notas y checklist y guarda copia del origen", async () => {
    const name = "migration-v1-to-v2-success";
    configureDatabaseNameForTests(name);
    const legacy = structuredClone(fixture);
    legacy.fixedExpenses[0].status = "Pagado";
    const notes = [{ id: "note-old", title: "Vitamina D", body: "Comprar", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }];
    values.set(SPACES_KEY, JSON.stringify(legacy.spaces));
    values.set(NOTES_KEY, JSON.stringify(notes));
    values.set(CHECKLIST_KEY, JSON.stringify(["product-fixture-1"]));
    await seedV1(name, legacy);

    const db = await openDb();
    expect(db.version).toBe(2);
    await expect(getAll("movements")).resolves.toMatchObject([{ id: "mov-fixture-1", amountCents: 4250 }]);
    await expect(getAll("fixedExpenses")).resolves.toMatchObject([{ id: "fixed-fixture-1", amountCents: 3500, startMonth: "2026-01" }]);
    await expect(getAll("fixedPayments")).resolves.toMatchObject([{ id: "fixed-fixture-1__2026-02", month: "2026-02", amountCents: 3500 }]);
    await expect(getAll("products")).resolves.toMatchObject([{ id: "product-fixture-1", lastUnitPriceCents: 250 }]);
    await expect(getAll("purchases")).resolves.toMatchObject([{ id: "purchase-fixture-1", totalCents: 250, unitPriceCents: 250 }]);
    await expect(getAll("notes")).resolves.toEqual(notes);
    await expect(getItem("spaces", "main")).resolves.toMatchObject({ state: { budgets: [{ limitCents: 15000 }], goals: [{ targetCents: 100000, savedCents: 10000 }] } });
    await expect(getItem("meta", "marketChecklist")).resolves.toMatchObject({ value: ["product-fixture-1"] });
    const backup = await getItem("meta", "migrationBackup-v1");
    expect(backup?.value).toMatchObject({ indexedDb: { movements: legacy.movements }, localStorage: { spaces: expect.any(String), notes: expect.any(String), checklist: expect.any(String) } });
    expect(values.size).toBe(0);
  });

  it("aborta sin cambiar la base ni borrar localStorage si los datos heredados no validan", async () => {
    const name = "migration-v1-to-v2-invalid";
    configureDatabaseNameForTests(name);
    values.set(NOTES_KEY, "{");
    await seedV1(name, fixture);

    await expect(openDb()).rejects.toThrow();
    expect(values.get(NOTES_KEY)).toBe("{");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        expect(request.result.version).toBe(1);
        const transaction = request.result.transaction("movements", "readonly");
        const get = transaction.objectStore("movements").get("mov-fixture-1");
        get.onsuccess = () => {
          expect(get.result.amount).toBe(42.5);
          request.result.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
});
