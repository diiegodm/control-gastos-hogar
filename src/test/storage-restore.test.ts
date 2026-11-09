import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/backup-v1.json";
import { configureDatabaseNameForTests, deleteFixedExpenseAndPayments, deleteFixedPayment, exportBackup, getAll, getItem, importBackup, migrateLegacyMarketPurchasesOnce, parseBackup, putItem, saveChecklistIds, saveFixedPaymentAndMovement, saveReceiptTicket } from "../lib/db";
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
    expect(v2.financialSettings).toEqual({ openingBalanceCents: 0, trackingStartMonth: "2026-01" });
    const oldV2 = { ...v2, version: 2 } as Record<string, unknown>;
    delete oldV2.financialSettings;
    expect(parseBackup(oldV2).financialSettings).toEqual({ openingBalanceCents: 0, trackingStartMonth: "2026-01" });
    expect(() => parseBackup({ ...v2, movements: [{ ...v2.movements[0], amountCents: 12.5 }] }))
      .toThrow("movements[0].amountCents debe ser un entero.");
    expect(() => parseBackup({ ...v2, version: 3, financialSettings: { openingBalanceCents: 0, trackingStartMonth: "2026-13" } }))
      .toThrow("financialSettings.trackingStartMonth debe tener formato YYYY-MM.");
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

  it("conserva el nombre y el XP local al importar un respaldo financiero antiguo", async () => {
    await putItem("meta", { key: "mascotProfile", value: { name: "Lima", onboardingComplete: true, celebratedStage: "crecimiento" } });
    await putItem("mascotEvents", { id: "movement:local", xp: 25, kind: "movement", reason: "Movimiento", sourceId: "local", occurredAt: "2026-11-09T12:00:00.000Z", activityDate: "2026-11-09" });
    await importBackup(fixture);

    await expect(getItem("meta", "mascotProfile")).resolves.toMatchObject({ value: { name: "Lima", onboardingComplete: true, celebratedStage: "crecimiento" } });
    await expect(getAll("mascotEvents")).resolves.toContainEqual(expect.objectContaining({ id: "movement:local", xp: 25 }));
  });

  it("recalcula el precio unitario del inventario desde la última compra por paquete", () => {
    const packagePurchase = structuredClone(fixture);
    packagePurchase.products[0].lastPrice = 6;
    packagePurchase.purchases[0].price = 6;
    packagePurchase.purchases[0].quantity = 3;
    packagePurchase.purchases[0].priceMode = "total";
    expect(parseBackup(packagePurchase).products[0].lastUnitPriceCents).toBe(200);
  });

  it("exporta y vuelve a importar v5 con saldo inicial, mascota y cargos fijos vinculados", async () => {
    const v2 = parseBackup(fixture);
    await importBackup(v2);
    const fixedPayment = { id: "fixed-fixture-1__2026-01", expenseId: "fixed-fixture-1", month: "2026-01", paidAt: "2026-01-10", amountCents: 3500, movementId: "fixed-movement-1" };
    const fixedMovement: Movement = { id: "fixed-movement-1", date: "2026-01-10", type: "Gasto", category: "Otros", description: "Internet", amountCents: 3500, fixedPaymentId: fixedPayment.id, generatedByFixedPayment: true, createdAt: "2026-01-10T12:00:00.000Z", updatedAt: "2026-01-10T12:00:00.000Z" };
    await saveFixedPaymentAndMovement(fixedPayment, fixedMovement);
    const note = { id: "note-v2", title: "Nota", body: "Contenido", createdAt: "2026-01-10T00:00:00.000Z", updatedAt: "2026-01-10T00:00:00.000Z" };
    await putItem("notes", note);
    await putItem("meta", { key: "financialSettings", value: { openingBalanceCents: 125000, trackingStartMonth: "2026-01" } });
    await saveChecklistIds(["product-fixture-1"]);
    const exported = await exportBackup();
    expect(exported.version).toBe(5);
    expect(exported.financialSettings).toEqual({ openingBalanceCents: 125000, trackingStartMonth: "2026-01" });
    expect(exported.fixedPayments).toContainEqual(fixedPayment);
    expect(exported.movements).toContainEqual(fixedMovement);
    expect(exported.notes).toEqual([note]);
    expect(exported.checklistIds).toEqual(["product-fixture-1"]);
    await importBackup(exported);
    await expect(getAll("movements")).resolves.toContainEqual(expect.objectContaining({ amountCents: 4250 }));
    await expect(getAll("movements")).resolves.toContainEqual(expect.objectContaining({ id: "fixed-movement-1", fixedPaymentId: fixedPayment.id }));
    await expect(getAll("fixedPayments")).resolves.toContainEqual(fixedPayment);
    await expect(getItem("meta", "financialSettings")).resolves.toMatchObject({ value: { openingBalanceCents: 125000, trackingStartMonth: "2026-01" } });
    await expect(getAll("notes")).resolves.toEqual([note]);
    await expect(getItem("meta", "marketChecklist")).resolves.toMatchObject({ value: ["product-fixture-1"] });
  });

  it("deshace un pago atómicamente y conserva movimientos que el usuario había creado", async () => {
    await importBackup(fixture);
    const manualPayment = { id: "fixed-fixture-1__2026-01", expenseId: "fixed-fixture-1", month: "2026-01", paidAt: "2026-01-10", amountCents: 3500, movementId: "manual-fixed-movement" };
    const manualMovement: Movement = { id: "manual-fixed-movement", date: "2026-01-10", type: "Gasto", category: "Otros", description: "Internet", amountCents: 3500, fixedPaymentId: manualPayment.id, createdAt: "2026-01-10T12:00:00.000Z", updatedAt: "2026-01-10T12:00:00.000Z" };
    await saveFixedPaymentAndMovement(manualPayment, manualMovement);
    await deleteFixedPayment(manualPayment.expenseId, manualPayment.month);

    await expect(getAll("fixedPayments")).resolves.toEqual([]);
    const preservedManualMovement = (await getAll("movements")).find((item) => item.id === manualMovement.id);
    expect(preservedManualMovement).toMatchObject({ id: manualMovement.id, amountCents: 3500 });
    expect(preservedManualMovement).not.toHaveProperty("fixedPaymentId");
  });

  it("al eliminar un cargo fijo conserva su movimiento como gasto histórico sin enlace roto", async () => {
    await importBackup(fixture);
    const payment = { id: "fixed-fixture-1__2026-01", expenseId: "fixed-fixture-1", month: "2026-01", paidAt: "2026-01-10", amountCents: 3500, movementId: "generated-fixed-movement" };
    const movement: Movement = { id: "generated-fixed-movement", date: "2026-01-10", type: "Gasto", category: "Otros", description: "Internet", amountCents: 3500, fixedPaymentId: payment.id, generatedByFixedPayment: true, createdAt: "2026-01-10T12:00:00.000Z", updatedAt: "2026-01-10T12:00:00.000Z" };
    await saveFixedPaymentAndMovement(payment, movement);
    await deleteFixedExpenseAndPayments("fixed-fixture-1");

    await expect(getAll("fixedExpenses")).resolves.toEqual([]);
    await expect(getAll("fixedPayments")).resolves.toEqual([]);
    const preservedHistoricalMovement = (await getAll("movements")).find((item) => item.id === movement.id);
    expect(preservedHistoricalMovement).toMatchObject({ id: movement.id, amountCents: 3500 });
    expect(preservedHistoricalMovement).not.toHaveProperty("fixedPaymentId");
    expect(preservedHistoricalMovement).not.toHaveProperty("generatedByFixedPayment");
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

  it("guarda ticket, movimiento único e inventario de forma atómica e incluye el ticket en el respaldo", async () => {
    const product = { id: "ticket-product", product: "Leche", category: "Despensa" as const, lastUnitPriceCents: 200, lastPurchaseDate: "2026-01-01", currentQty: 3, minQty: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    const ticket = { id: "ticket-one", storeName: "Tienda", date: "2026-01-12", totalCents: 600, lines: [{ id: "line-one", description: "Leche", quantity: 2, unitPriceCents: 200, totalCents: 400, inventoryAction: "update" as const, productId: product.id, category: "Despensa" as const }], movementId: "ticket_ticket-one", createdAt: "2026-01-12T10:00:00.000Z" };
    const movement: Movement = { id: ticket.movementId, date: ticket.date, type: "Gasto", category: "Mercado", description: "Compra en Tienda", amountCents: ticket.totalCents, source: "ticket", ticketId: ticket.id, createdAt: ticket.createdAt, updatedAt: ticket.createdAt };
    const purchase = { id: "ticket-purchase-one", productId: product.id, product: product.product, totalCents: 400, quantity: 2, unitPriceCents: 200, priceMode: "total" as const, date: ticket.date, createdAt: ticket.createdAt };
    await saveReceiptTicket(ticket, movement, [{ ...product, currentQty: 5 }], [purchase]);
    expect(await getAll("tickets")).toHaveLength(1);
    expect(await getAll("movements")).toEqual([movement]);
    expect(await getAll("products")).toMatchObject([{ id: product.id, currentQty: 5 }]);
    expect(await getAll("purchases")).toEqual([purchase]);
    const exported = await exportBackup();
    expect(exported.tickets).toEqual([ticket]);
    expect(exported.movements).toContainEqual(movement);
    await importBackup(exported);
    expect(await getAll("tickets")).toEqual([ticket]);

    await expect(saveReceiptTicket(ticket, movement, [{ ...product, currentQty: 9 }], [{ ...purchase, id: "ticket-purchase-duplicate" }])).rejects.toBeTruthy();
    expect(await getAll("products")).toMatchObject([{ id: product.id, currentQty: 5 }]);
    expect(await getAll("purchases")).toEqual([purchase]);
  });
});
