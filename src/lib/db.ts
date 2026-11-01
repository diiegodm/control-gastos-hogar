import type { BackupPayload, FixedExpense, FixedPayment, MarketProduct, MarketPurchase, Movement } from "../types/finance";
import type { Note } from "../types/notes";
import type { BudgetSpace, GoalSpace, SpacesState } from "../types/spaces";
import { todayISO } from "./date";
import { toCents } from "./money";

let databaseName = "finanzas-hogar-db";
const DB_VERSION = 2;
const LEGACY_SPACES_KEY = "finanzas-hogar-spaces-v1";
const LEGACY_NOTES_KEY = "finanzas-hogar-notes-v1";
const LEGACY_CHECKLIST_KEY = "finanzas-hogar-market-checklist-v1";
const DATA_STORES = ["movements", "fixedExpenses", "fixedPayments", "products", "purchases", "spaces", "notes"] as const;
const STORE_NAMES = [...DATA_STORES, "meta"] as const;
type StoreName = (typeof STORE_NAMES)[number];
type SpacesRecord = { id: "main"; state: SpacesState };
type MetaRecord = { key: string; value: unknown };
type StoreMap = {
  movements: Movement;
  fixedExpenses: FixedExpense;
  fixedPayments: FixedPayment;
  products: MarketProduct;
  purchases: MarketPurchase;
  spaces: SpacesRecord;
  notes: Note;
  meta: MetaRecord;
};
type StoreSnapshot = { [K in (typeof DATA_STORES)[number]]: StoreMap[K][] } & { meta: MetaRecord[] };

const EMPTY_SPACES: SpacesState = { budgets: [], goals: [], budgetCategories: [], goalCategories: [], movementCategories: [] };
let dbPromise: Promise<IDBDatabase> | null = null;
let activeDb: IDBDatabase | null = null;
let migrationFailure: Error | null = null;

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} debe ser un objeto válido.`);
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label}.${key} debe ser un texto válido.`);
  return value;
}

function optionalString(record: Record<string, unknown>, key: string, label: string): void {
  if (record[key] !== undefined && typeof record[key] !== "string") throw new Error(`${label}.${key} debe ser un texto válido.`);
}

function finiteNumber(record: Record<string, unknown>, key: string, label: string, integer = false): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    throw new Error(`${label}.${key} debe ser ${integer ? "un entero" : "un número finito"}.`);
  }
  return value;
}

function isoDate(record: Record<string, unknown>, key: string, label: string): string {
  const value = requiredString(record, key, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}.${key} debe tener formato YYYY-MM-DD.`);
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`${label}.${key} no es una fecha válida.`);
  }
  return value;
}

function yearMonth(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error(`${label} debe tener formato YYYY-MM.`);
  return value;
}

function recordArray(value: unknown, key: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`El respaldo debe incluir la lista "${key}".`);
  const seenIds = new Set<string>();
  return value.map((item, index) => {
    const label = `${key}[${index}]`;
    const record = asRecord(item, label);
    const id = requiredString(record, "id", label);
    if (seenIds.has(id)) throw new Error(`El respaldo contiene un identificador duplicado en ${label}.`);
    seenIds.add(id);
    return record;
  });
}

function parseSpaces(raw: unknown, legacy: boolean): SpacesState {
  const spaces = asRecord(raw, "spaces");
  const budgets = recordArray(spaces.budgets, "spaces.budgets").map((item, index) => {
    const label = `spaces.budgets[${index}]`;
    requiredString(item, "name", label);
    requiredString(item, "category", label);
    requiredString(item, "color", label);
    requiredString(item, "icon", label);
    if (typeof item.archived !== "boolean") throw new Error(`${label}.archived debe ser booleano.`);
    optionalString(item, "categoryName", label);
    const limitCents = legacy ? toCents(finiteNumber(item, "limit", label)) : finiteNumber(item, "limitCents", label, true);
    const { limit: _oldLimit, ...rest } = item;
    return { ...rest, limitCents } as unknown as BudgetSpace;
  });
  const goals = recordArray(spaces.goals, "spaces.goals").map((item, index) => {
    const label = `spaces.goals[${index}]`;
    requiredString(item, "name", label);
    requiredString(item, "color", label);
    requiredString(item, "icon", label);
    if (typeof item.archived !== "boolean") throw new Error(`${label}.archived debe ser booleano.`);
    optionalString(item, "categoryName", label);
    const targetCents = legacy ? toCents(finiteNumber(item, "target", label)) : finiteNumber(item, "targetCents", label, true);
    const savedCents = legacy ? toCents(finiteNumber(item, "saved", label)) : finiteNumber(item, "savedCents", label, true);
    const contributions = item.contributions === undefined ? [] : item.contributions;
    if (!Array.isArray(contributions)) throw new Error(`${label}.contributions debe ser una lista.`);
    const converted = contributions.map((rawContribution, contributionIndex) => {
      const contributionLabel = `${label}.contributions[${contributionIndex}]`;
      const contribution = asRecord(rawContribution, contributionLabel);
      requiredString(contribution, "date", contributionLabel);
      const amountCents = legacy
        ? toCents(finiteNumber(contribution, "amount", contributionLabel))
        : finiteNumber(contribution, "amountCents", contributionLabel, true);
      return { amountCents, date: contribution.date as string };
    });
    const { target: _oldTarget, saved: _oldSaved, ...rest } = item;
    return { ...rest, targetCents, savedCents, contributions: converted } as unknown as GoalSpace;
  });
  const stringList = (key: string, fallback: string[] = []): string[] => {
    const list = spaces[key];
    if (list === undefined) return fallback;
    if (!Array.isArray(list) || list.some((entry) => typeof entry !== "string")) throw new Error(`spaces.${key} debe ser una lista de textos.`);
    return list as string[];
  };
  return {
    budgets,
    goals,
    budgetCategories: stringList("budgetCategories", [...new Set(budgets.map((item) => item.categoryName).filter((name): name is string => Boolean(name)))]),
    goalCategories: stringList("goalCategories", [...new Set(goals.map((item) => item.categoryName).filter((name): name is string => Boolean(name)))]),
    movementCategories: stringList("movementCategories"),
  };
}

function parseNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) throw new Error("notes debe ser una lista.");
  const ids = new Set<string>();
  return raw.map((entry, index) => {
    const label = `notes[${index}]`;
    const item = asRecord(entry, label);
    const id = requiredString(item, "id", label);
    if (ids.has(id)) throw new Error(`El respaldo contiene un identificador duplicado en ${label}.`);
    ids.add(id);
    requiredString(item, "title", label);
    requiredString(item, "body", label);
    requiredString(item, "createdAt", label);
    requiredString(item, "updatedAt", label);
    return item as unknown as Note;
  });
}

function parseBackupV1(backup: Record<string, unknown>): BackupPayload {
  const movements = recordArray(backup.movements, "movements").map((item, index) => {
    const label = `movements[${index}]`;
    isoDate(item, "date", label);
    requiredString(item, "createdAt", label); requiredString(item, "updatedAt", label);
    requiredString(item, "createdAt", label); requiredString(item, "updatedAt", label);
    if (item.type !== "Ingreso" && item.type !== "Gasto") throw new Error(`${label}.type no es válido.`);
    requiredString(item, "category", label);
    requiredString(item, "description", label);
    const amountCents = toCents(finiteNumber(item, "amount", label));
    optionalString(item, "budgetSpaceId", label); optionalString(item, "source", label); optionalString(item, "purchaseId", label);
    const { amount: _oldAmount, ...rest } = item;
    return { ...rest, amountCents } as unknown as Movement;
  });
  const fixedExpenses: FixedExpense[] = [];
  const fixedPayments: FixedPayment[] = [];
  recordArray(backup.fixedExpenses, "fixedExpenses").forEach((item, index) => {
    const label = `fixedExpenses[${index}]`;
    requiredString(item, "concept", label); optionalString(item, "category", label);
    const amountCents = toCents(finiteNumber(item, "amount", label));
    const payDay = finiteNumber(item, "payDay", label, true);
    if (payDay < 1 || payDay > 31) throw new Error(`${label}.payDay debe ser un día entre 1 y 31.`);
    const dueDate = isoDate(item, "dueDate", label);
    if (item.status !== "Pendiente" && item.status !== "Pagado") throw new Error(`${label}.status no es válido.`);
    const createdAt = requiredString(item, "createdAt", label);
    const startMonth = /^\d{4}-\d{2}/.test(createdAt) ? createdAt.slice(0, 7) : dueDate.slice(0, 7);
    yearMonth(startMonth, `${label}.startMonth`);
    const { amount: _oldAmount, dueDate: _oldDueDate, status: _oldStatus, ...rest } = item;
    fixedExpenses.push({
      ...rest, id: requiredString(item, "id", label), concept: item.concept as string, amountCents, payDay,
      startMonth, createdAt, updatedAt: String(item.updatedAt || createdAt),
    });
    if (item.status === "Pagado") fixedPayments.push({
      id: `${String(item.id)}__${dueDate.slice(0, 7)}`, expenseId: String(item.id), month: dueDate.slice(0, 7),
      paidAt: dueDate, amountCents,
    });
  });
  let products = recordArray(backup.products, "products").map((item, index) => {
    const label = `products[${index}]`;
    requiredString(item, "product", label);
    requiredString(item, "category", label);
    const lastUnitPriceCents = toCents(finiteNumber(item, "lastPrice", label));
    isoDate(item, "lastPurchaseDate", label);
    finiteNumber(item, "currentQty", label);
    finiteNumber(item, "minQty", label);
    const { lastPrice: _oldPrice, ...rest } = item;
    return { ...rest, lastUnitPriceCents } as unknown as MarketProduct;
  });
  const purchases = recordArray(backup.purchases, "purchases").map((item, index) => {
    const label = `purchases[${index}]`;
    requiredString(item, "productId", label);
    requiredString(item, "product", label);
    requiredString(item, "createdAt", label);
    const totalCents = toCents(finiteNumber(item, "price", label));
    if (item.quantity !== undefined) finiteNumber(item, "quantity", label);
    const unitPriceCents = item.unitPrice === undefined ? undefined : toCents(finiteNumber(item, "unitPrice", label));
    isoDate(item, "date", label);
    if (item.priceMode !== undefined && item.priceMode !== "total" && item.priceMode !== "unit") throw new Error(`${label}.priceMode no es válido.`);
    const { price: _oldPrice, unitPrice: _oldUnitPrice, ...rest } = item;
    return { ...rest, totalCents, unitPriceCents } as unknown as MarketPurchase;
  });
  products = products.map((product) => {
    const lastPurchase = purchases
      .filter((purchase) => purchase.productId === product.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
    if (!lastPurchase) return product;
    const quantity = lastPurchase.quantity && lastPurchase.quantity > 0 ? lastPurchase.quantity : 1;
    const unitPriceCents = lastPurchase.priceMode === "unit" && lastPurchase.unitPriceCents !== undefined
      ? lastPurchase.unitPriceCents
      : Math.round(lastPurchase.totalCents / quantity);
    return { ...product, lastUnitPriceCents: unitPriceCents };
  });
  const spaces = backup.spaces === undefined ? EMPTY_SPACES : parseSpaces(backup.spaces, true);
  const notes = backup.notes === undefined ? [] : parseNotes(backup.notes);
  const checklistIds = backup.checklistIds === undefined ? [] : parseChecklist(backup.checklistIds);
  return { version: 2, exportedAt: String(backup.exportedAt || new Date().toISOString()), movements, fixedExpenses, fixedPayments, products, purchases, spaces, notes, checklistIds };
}

function parseChecklist(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== "string")) throw new Error("checklistIds debe ser una lista de identificadores.");
  return [...new Set(raw as string[])];
}

export function parseBackup(raw: unknown): BackupPayload {
  const backup = asRecord(raw, "El respaldo");
  if (backup.version === 1) return parseBackupV1(backup);
  if (backup.version !== 2) throw new Error("La versión del respaldo no es compatible.");
  requiredString(backup, "exportedAt", "El respaldo");
  const movements = recordArray(backup.movements, "movements").map((item, index) => {
    const label = `movements[${index}]`;
    isoDate(item, "date", label);
    if (item.type !== "Ingreso" && item.type !== "Gasto") throw new Error(`${label}.type no es válido.`);
    requiredString(item, "category", label); requiredString(item, "description", label);
    finiteNumber(item, "amountCents", label, true); optionalString(item, "budgetSpaceId", label); optionalString(item, "source", label); optionalString(item, "purchaseId", label);
    return item as unknown as Movement;
  });
  const fixedExpenses = recordArray(backup.fixedExpenses, "fixedExpenses").map((item, index) => {
    const label = `fixedExpenses[${index}]`;
    requiredString(item, "concept", label); optionalString(item, "category", label); finiteNumber(item, "amountCents", label, true);
    requiredString(item, "createdAt", label); requiredString(item, "updatedAt", label);
    const payDay = finiteNumber(item, "payDay", label, true);
    if (payDay < 1 || payDay > 31) throw new Error(`${label}.payDay debe ser un día entre 1 y 31.`);
    yearMonth(item.startMonth, `${label}.startMonth`);
    if (item.endMonth !== undefined && yearMonth(item.endMonth, `${label}.endMonth`) < String(item.startMonth)) {
      throw new Error(`${label}.endMonth no puede ser anterior a startMonth.`);
    }
    return item as unknown as FixedExpense;
  });
  const fixedPayments = recordArray(backup.fixedPayments, "fixedPayments").map((item, index) => {
    const label = `fixedPayments[${index}]`;
    requiredString(item, "expenseId", label); yearMonth(item.month, `${label}.month`);
    requiredString(item, "paidAt", label); finiteNumber(item, "amountCents", label, true);
    return item as unknown as FixedPayment;
  });
  const fixedExpenseIds = new Set(fixedExpenses.map((expense) => expense.id));
  for (const payment of fixedPayments) {
    if (!fixedExpenseIds.has(payment.expenseId)) throw new Error(`El pago fijo "${payment.id}" no corresponde a un cargo existente.`);
  }
  const products = recordArray(backup.products, "products").map((item, index) => {
    const label = `products[${index}]`;
    requiredString(item, "product", label); requiredString(item, "category", label);
    requiredString(item, "createdAt", label); requiredString(item, "updatedAt", label);
    finiteNumber(item, "lastUnitPriceCents", label, true); isoDate(item, "lastPurchaseDate", label);
    finiteNumber(item, "currentQty", label); finiteNumber(item, "minQty", label);
    return item as unknown as MarketProduct;
  });
  const purchases = recordArray(backup.purchases, "purchases").map((item, index) => {
    const label = `purchases[${index}]`;
    requiredString(item, "productId", label); requiredString(item, "product", label);
    requiredString(item, "createdAt", label);
    finiteNumber(item, "totalCents", label, true);
    if (item.quantity !== undefined) finiteNumber(item, "quantity", label);
    if (item.unitPriceCents !== undefined) finiteNumber(item, "unitPriceCents", label, true);
    isoDate(item, "date", label);
    return item as unknown as MarketPurchase;
  });
  const spaces = parseSpaces(backup.spaces, false);
  const notes = parseNotes(backup.notes);
  const checklistIds = parseChecklist(backup.checklistIds);
  return { version: 2, exportedAt: String(backup.exportedAt), movements, fixedExpenses, fixedPayments, products, purchases, spaces, notes, checklistIds };
}

function readLegacyLocalStorage(): { spaces?: unknown; notes: Note[]; checklistIds: string[]; raw: Record<string, string | null> } {
  const raw = {
    spaces: localStorage.getItem(LEGACY_SPACES_KEY),
    notes: localStorage.getItem(LEGACY_NOTES_KEY),
    checklist: localStorage.getItem(LEGACY_CHECKLIST_KEY),
  };
  const spaces = raw.spaces ? JSON.parse(raw.spaces) as unknown : undefined;
  if (spaces !== undefined) parseSpaces(spaces, true);
  const notes = raw.notes ? parseNotes(JSON.parse(raw.notes) as unknown) : [];
  const checklistIds = raw.checklist ? parseChecklist(JSON.parse(raw.checklist) as unknown) : [];
  return { spaces, notes, checklistIds, raw };
}

function migrateV1(request: IDBOpenDBRequest, oldVersion: number): void {
  const db = request.result;
  const transaction = request.transaction;
  if (!transaction) throw new Error("No se pudo iniciar la migración de datos locales.");
  for (const name of STORE_NAMES) {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === "meta" ? "key" : "id" });
  }
  const legacy = readLegacyLocalStorage();
  const sourceStores = ["movements", "fixedExpenses", "products", "purchases"] as const;
  const source: Record<string, unknown[]> = {};
  let remaining = sourceStores.length;
  const abort = (error: unknown) => {
    migrationFailure = error instanceof Error ? error : new Error("Falló la migración de los datos locales.");
    try { transaction.abort(); } catch { /* The transaction may already be aborting. */ }
  };
  for (const name of sourceStores) {
    const getRequest = transaction.objectStore(name).getAll();
    getRequest.onerror = () => abort(getRequest.error ?? new Error(`No se pudieron leer los datos de ${name}.`));
    getRequest.onsuccess = () => {
      source[name] = getRequest.result as unknown[];
      remaining -= 1;
      if (remaining !== 0) return;
      try {
        const originalBackup = {
          key: "migrationBackup-v1",
          value: { capturedAt: new Date().toISOString(), indexedDb: source, localStorage: legacy.raw },
        } satisfies MetaRecord;
        const converted = parseBackup({
          version: 1,
          exportedAt: new Date().toISOString(),
          ...source,
          ...(legacy.spaces ? { spaces: legacy.spaces } : {}),
          notes: legacy.notes,
          checklistIds: legacy.checklistIds,
        });
        transaction.objectStore("meta").put(originalBackup);
        transaction.objectStore("meta").put({ key: "marketChecklist", value: converted.checklistIds } satisfies MetaRecord);
        transaction.objectStore("spaces").put({ id: "main", state: converted.spaces } satisfies SpacesRecord);
        for (const storeName of sourceStores) {
          const store = transaction.objectStore(storeName);
          store.clear();
          const values = converted[storeName];
          for (const item of values) store.put(item);
        }
        const fixedPaymentStore = transaction.objectStore("fixedPayments");
        for (const item of converted.fixedPayments) fixedPaymentStore.put(item);
        for (const note of converted.notes) transaction.objectStore("notes").put(note);
        transaction.objectStore("meta").put({ key: "schemaVersion", value: 2 } satisfies MetaRecord);
      } catch (error) {
        abort(error);
      }
    };
  }
}

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    let upgraded = false;
    const request = indexedDB.open(databaseName, DB_VERSION);
    request.onupgradeneeded = (event) => {
      try {
        if (event.oldVersion < 2) { upgraded = true; migrationFailure = null; migrateV1(request, event.oldVersion); }
      } catch (error) {
        request.transaction?.abort();
        if (!settled) { settled = true; reject(error instanceof Error ? error : new Error("Falló la migración del almacenamiento.")); }
      }
    };
    request.onblocked = () => {
      if (!settled) { settled = true; reject(new Error("Cierra las otras pestañas de Finanzas Hogar para completar la actualización de datos.")); }
    };
    request.onerror = () => {
      if (!settled) { settled = true; reject(migrationFailure ?? request.error ?? new Error("No se pudo abrir o migrar el almacenamiento local.")); }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      settled = true;
      activeDb = db;
      db.onversionchange = () => { db.close(); activeDb = null; dbPromise = null; };
      resolve(db);
      if (upgraded) {
        for (const key of [LEGACY_SPACES_KEY, LEGACY_NOTES_KEY, LEGACY_CHECKLIST_KEY]) {
          try { localStorage.removeItem(key); } catch { /* Keep the source copy if cleanup is unavailable. */ }
        }
      }
    };
  });
  dbPromise = opening;
  void opening.catch(() => { if (dbPromise === opening) dbPromise = null; });
  return opening;
}

async function runTransaction<T>(stores: StoreName | StoreName[], mode: IDBTransactionMode, action: (transaction: IDBTransaction) => void): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    try { transaction = db.transaction(stores, mode); action(transaction); }
    catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Falló una transacción de almacenamiento."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló una transacción de almacenamiento."));
  });
}

export async function getAll<K extends StoreName>(storeName: K): Promise<StoreMap[K][]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    let result: StoreMap[K][] = [];
    request.onsuccess = () => { result = request.result as StoreMap[K][]; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudieron leer los datos locales."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló la lectura local."));
  });
}

export async function getItem<K extends StoreName>(storeName: K, id: string): Promise<StoreMap[K] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(id);
    let result: StoreMap[K] | undefined;
    request.onsuccess = () => { result = request.result as StoreMap[K] | undefined; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudieron leer los datos locales."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló la lectura local."));
  });
}

export async function putItem<K extends StoreName>(storeName: K, item: StoreMap[K]): Promise<void> {
  await runTransaction(storeName, "readwrite", (transaction) => { transaction.objectStore(storeName).put(item); });
}

export async function saveMarketPurchaseBatch(products: MarketProduct[], purchases: MarketPurchase[], movements: Movement[]): Promise<void> {
  await runTransaction(["products", "purchases", "movements"], "readwrite", (transaction) => {
    for (const product of products) transaction.objectStore("products").put(product);
    for (const purchase of purchases) transaction.objectStore("purchases").put(purchase);
    for (const movement of movements) transaction.objectStore("movements").put(movement);
  });
}

export async function migrateLegacyMarketPurchasesOnce(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(["movements", "purchases", "meta"], "readwrite");
    const movementStore = transaction.objectStore("movements");
    const purchaseStore = transaction.objectStore("purchases");
    const metaStore = transaction.objectStore("meta");
    const movementsRequest = movementStore.getAll();
    const purchasesRequest = purchaseStore.getAll();
    const markerRequest = metaStore.get("marketPurchaseMovementsMigrated");
    let remaining = 3;
    let existingMovements: Movement[] = [];
    let purchases: MarketPurchase[] = [];
    let marker: MetaRecord | undefined;
    const prepare = () => {
      remaining -= 1;
      if (remaining !== 0 || marker?.value === true) return;
      const linked = new Set(existingMovements.flatMap((item) => [item.purchaseId, item.id]));
      for (const purchase of purchases) {
        const id = `market_${purchase.id}`;
        if (linked.has(purchase.id) || linked.has(id)) continue;
        movementStore.put({
          id, date: purchase.date, type: "Gasto", category: "Mercado", description: `Compra: ${purchase.product}`,
          amountCents: purchase.totalCents, source: "market", purchaseId: purchase.id,
          createdAt: purchase.createdAt, updatedAt: purchase.createdAt,
        } satisfies Movement);
      }
      metaStore.put({ key: "marketPurchaseMovementsMigrated", value: true } satisfies MetaRecord);
    };
    movementsRequest.onsuccess = () => { existingMovements = movementsRequest.result as Movement[]; prepare(); };
    purchasesRequest.onsuccess = () => { purchases = purchasesRequest.result as MarketPurchase[]; prepare(); };
    markerRequest.onsuccess = () => { marker = markerRequest.result as MetaRecord | undefined; prepare(); };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo actualizar el historial de compras."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló la actualización del historial de compras."));
  });
}

export async function deleteItem(storeName: StoreName, id: string): Promise<void> {
  await runTransaction(storeName, "readwrite", (transaction) => { transaction.objectStore(storeName).delete(id); });
}

export async function deleteFixedPayment(expenseId: string, month: string): Promise<void> {
  await deleteItem("fixedPayments", `${expenseId}__${month}`);
}

export async function deleteFixedExpenseAndPayments(expenseId: string): Promise<void> {
  await runTransaction(["fixedExpenses", "fixedPayments"], "readwrite", (transaction) => {
    transaction.objectStore("fixedExpenses").delete(expenseId);
    const payments = transaction.objectStore("fixedPayments").openCursor();
    payments.onsuccess = () => {
      const cursor = payments.result;
      if (!cursor) return;
      if ((cursor.value as FixedPayment).expenseId === expenseId) cursor.delete();
      cursor.continue();
    };
  });
}

export async function saveChecklistIds(ids: string[]): Promise<void> {
  await putItem("meta", { key: "marketChecklist", value: [...new Set(ids)] });
}

export async function getChecklistIds(): Promise<string[]> {
  const record = await getItem("meta", "marketChecklist");
  return Array.isArray(record?.value) ? record.value.filter((id): id is string => typeof id === "string") : [];
}

async function readSnapshot(): Promise<StoreSnapshot> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([...STORE_NAMES], "readonly");
    const snapshot = {} as StoreSnapshot;
    for (const name of STORE_NAMES) {
      const request = transaction.objectStore(name).getAll();
      request.onsuccess = () => { (snapshot as Record<string, unknown[]>)[name] = request.result as unknown[]; };
    }
    transaction.oncomplete = () => resolve(snapshot);
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo leer el respaldo actual."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló la lectura del respaldo actual."));
  });
}

function backupFromSnapshot(snapshot: StoreSnapshot): BackupPayload {
  const spaces = snapshot.spaces.find((record) => record.id === "main")?.state ?? EMPTY_SPACES;
  const checklistIds = snapshot.meta.find((record) => record.key === "marketChecklist")?.value ?? [];
  return parseBackup({
    version: 2, exportedAt: new Date().toISOString(), movements: snapshot.movements,
    fixedExpenses: snapshot.fixedExpenses, fixedPayments: snapshot.fixedPayments,
    products: snapshot.products, purchases: snapshot.purchases, spaces,
    notes: snapshot.notes, checklistIds,
  });
}

export async function exportBackup(): Promise<BackupPayload> {
  return backupFromSnapshot(await readSnapshot());
}

export function downloadBackup(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finanzas-hogar-${todayISO()}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function replaceBackupAtomically(backup: BackupPayload): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([...STORE_NAMES], "readwrite");
    for (const name of DATA_STORES) transaction.objectStore(name).clear();
    for (const item of backup.movements) transaction.objectStore("movements").put(item);
    for (const item of backup.fixedExpenses) transaction.objectStore("fixedExpenses").put(item);
    for (const item of backup.fixedPayments) transaction.objectStore("fixedPayments").put(item);
    for (const item of backup.products) transaction.objectStore("products").put(item);
    for (const item of backup.purchases) transaction.objectStore("purchases").put(item);
    const linkedPurchases = new Set(backup.movements.flatMap((item) => [item.purchaseId, item.id]));
    const movementStore = transaction.objectStore("movements");
    for (const purchase of backup.purchases) {
      const id = `market_${purchase.id}`;
      if (linkedPurchases.has(purchase.id) || linkedPurchases.has(id)) continue;
      movementStore.put({
        id, date: purchase.date, type: "Gasto", category: "Mercado", description: `Compra: ${purchase.product}`,
        amountCents: purchase.totalCents, source: "market", purchaseId: purchase.id,
        createdAt: purchase.createdAt, updatedAt: purchase.createdAt,
      } satisfies Movement);
    }
    transaction.objectStore("spaces").put({ id: "main", state: backup.spaces } satisfies SpacesRecord);
    for (const note of backup.notes) transaction.objectStore("notes").put(note);
    transaction.objectStore("meta").put({ key: "marketChecklist", value: backup.checklistIds } satisfies MetaRecord);
    transaction.objectStore("meta").put({ key: "marketPurchaseMovementsMigrated", value: true } satisfies MetaRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo completar la restauración."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló la restauración; los datos anteriores se mantienen."));
  });
}

export async function importBackup(raw: unknown): Promise<void> {
  const backup = parseBackup(raw);
  await replaceBackupAtomically(backup);
  window.dispatchEvent(new Event("finance-data-restored"));
}

export function resetDbConnectionForTests(): void {
  activeDb?.close();
  activeDb = null;
  dbPromise = null;
}

export function configureDatabaseNameForTests(name: string): void {
  resetDbConnectionForTests();
  databaseName = name;
}
