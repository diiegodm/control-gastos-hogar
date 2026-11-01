import type {
  BackupPayload,
  FixedExpense,
  MarketProduct,
  MarketPurchase,
  Movement,
} from "../types/finance";
import type { BudgetSpace, GoalSpace, SpacesState } from "../types/spaces";
import { todayISO } from "./date";

const DB_NAME = "finanzas-hogar-db";
const DB_VERSION = 1;
const SPACES_KEY = "finanzas-hogar-spaces-v1";
const STORE_NAMES = ["movements", "fixedExpenses", "products", "purchases"] as const;
type StoreName = (typeof STORE_NAMES)[number];

type StoreMap = {
  movements: Movement;
  fixedExpenses: FixedExpense;
  products: MarketProduct;
  purchases: MarketPurchase;
};

type StoreSnapshot = { [K in StoreName]: StoreMap[K][] };

let dbPromise: Promise<IDBDatabase> | null = null;

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORE_NAMES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir el almacenamiento local."));
  });

  dbPromise = opening;
  void opening.catch(() => {
    if (dbPromise === opening) dbPromise = null;
  });
  return opening;
}

async function tx<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    let result: T | void;
    const request = action(transaction.objectStore(storeName));

    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error ?? new Error("Falló una operación de almacenamiento."));
    }

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error ?? new Error("Falló una transacción de almacenamiento."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló una transacción de almacenamiento."));
  });
}

function readAllStores(): Promise<StoreSnapshot> {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction([...STORE_NAMES], "readonly");
    const snapshot = {} as StoreSnapshot;

    for (const name of STORE_NAMES) {
      const request = transaction.objectStore(name).getAll();
      request.onsuccess = () => { (snapshot as Record<StoreName, unknown[]>)[name] = request.result as unknown[]; };
    }

    transaction.oncomplete = () => resolve(snapshot);
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo leer el respaldo actual."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló la lectura del respaldo actual."));
  }));
}

function replaceStoresAtomically(snapshot: StoreSnapshot): Promise<void> {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction([...STORE_NAMES], "readwrite");

    for (const name of STORE_NAMES) {
      const store = transaction.objectStore(name);
      store.clear();
      for (const item of snapshot[name]) store.put(item);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo completar la restauración."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló la restauración; los datos anteriores se mantienen."));
  }));
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} debe ser un objeto válido.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}.${key} debe ser un texto válido.`);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string, label: string): void {
  if (record[key] !== undefined && typeof record[key] !== "string") {
    throw new Error(`${label}.${key} debe ser un texto válido.`);
  }
}

function finiteNumber(record: Record<string, unknown>, key: string, label: string, optional = false): void {
  const value = record[key];
  if (optional && value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}.${key} debe ser un número finito.`);
  }
}

function isoDate(record: Record<string, unknown>, key: string, label: string): void {
  const value = requiredString(record, key, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label}.${key} debe tener formato YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`${label}.${key} no es una fecha válida.`);
  }
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

function parseSpaces(value: unknown): SpacesState {
  const spaces = asRecord(value, "spaces");
  const budgets = recordArray(spaces.budgets, "spaces.budgets").map((item, index) => {
    const label = `spaces.budgets[${index}]`;
    requiredString(item, "name", label);
    requiredString(item, "category", label);
    finiteNumber(item, "limit", label);
    requiredString(item, "color", label);
    requiredString(item, "icon", label);
    if (typeof item.archived !== "boolean") throw new Error(`${label}.archived debe ser booleano.`);
    optionalString(item, "categoryName", label);
    return item as unknown as BudgetSpace;
  });
  const goals = recordArray(spaces.goals, "spaces.goals").map((item, index) => {
    const label = `spaces.goals[${index}]`;
    requiredString(item, "name", label);
    finiteNumber(item, "target", label);
    finiteNumber(item, "saved", label);
    requiredString(item, "color", label);
    requiredString(item, "icon", label);
    if (typeof item.archived !== "boolean") throw new Error(`${label}.archived debe ser booleano.`);
    optionalString(item, "categoryName", label);
    if (item.contributions !== undefined) {
      if (!Array.isArray(item.contributions)) throw new Error(`${label}.contributions debe ser una lista.`);
      item.contributions.forEach((rawContribution, contributionIndex) => {
        const contributionLabel = `${label}.contributions[${contributionIndex}]`;
        const contribution = asRecord(rawContribution, contributionLabel);
        finiteNumber(contribution, "amount", contributionLabel);
        requiredString(contribution, "date", contributionLabel);
      });
    }
    return item as unknown as GoalSpace;
  });
  const stringList = (key: string, fallback: string[] = []): string[] => {
    const list = spaces[key];
    if (list === undefined) return fallback;
    if (!Array.isArray(list) || list.some((entry) => typeof entry !== "string")) {
      throw new Error(`spaces.${key} debe ser una lista de textos.`);
    }
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

export function parseBackup(raw: unknown): BackupPayload {
  const backup = asRecord(raw, "El respaldo");
  if (backup.version !== 1) throw new Error("La versión del respaldo no es compatible.");

  const movements = recordArray(backup.movements, "movements").map((item, index) => {
    const label = `movements[${index}]`;
    isoDate(item, "date", label);
    if (item.type !== "Ingreso" && item.type !== "Gasto") throw new Error(`${label}.type no es válido.`);
    requiredString(item, "category", label);
    requiredString(item, "description", label);
    finiteNumber(item, "amount", label);
    optionalString(item, "budgetSpaceId", label);
    return item as unknown as Movement;
  });
  const fixedExpenses = recordArray(backup.fixedExpenses, "fixedExpenses").map((item, index) => {
    const label = `fixedExpenses[${index}]`;
    requiredString(item, "concept", label);
    finiteNumber(item, "amount", label);
    finiteNumber(item, "payDay", label);
    if (!Number.isInteger(item.payDay) || Number(item.payDay) < 1 || Number(item.payDay) > 31) {
      throw new Error(`${label}.payDay debe ser un día entre 1 y 31.`);
    }
    isoDate(item, "dueDate", label);
    if (item.status !== "Pendiente" && item.status !== "Pagado") throw new Error(`${label}.status no es válido.`);
    return item as unknown as FixedExpense;
  });
  const products = recordArray(backup.products, "products").map((item, index) => {
    const label = `products[${index}]`;
    requiredString(item, "product", label);
    requiredString(item, "category", label);
    finiteNumber(item, "lastPrice", label);
    isoDate(item, "lastPurchaseDate", label);
    finiteNumber(item, "currentQty", label);
    finiteNumber(item, "minQty", label);
    return item as unknown as MarketProduct;
  });
  const purchases = recordArray(backup.purchases, "purchases").map((item, index) => {
    const label = `purchases[${index}]`;
    requiredString(item, "productId", label);
    requiredString(item, "product", label);
    finiteNumber(item, "price", label);
    finiteNumber(item, "quantity", label, true);
    finiteNumber(item, "unitPrice", label, true);
    isoDate(item, "date", label);
    if (item.priceMode !== undefined && item.priceMode !== "total" && item.priceMode !== "unit") {
      throw new Error(`${label}.priceMode no es válido.`);
    }
    return item as unknown as MarketPurchase;
  });
  requiredString(backup, "exportedAt", "El respaldo");

  const spaces = backup.spaces === undefined ? undefined : parseSpaces(backup.spaces);
  return {
    version: 1,
    exportedAt: String(backup.exportedAt),
    movements,
    fixedExpenses,
    products,
    purchases,
    ...(spaces ? { spaces } : {}),
  };
}

export async function getAll<K extends StoreName>(storeName: K): Promise<StoreMap[K][]> {
  return (await tx<StoreMap[K][]>(storeName, "readonly", (store) => store.getAll())) ?? [];
}

export async function putItem<K extends StoreName>(storeName: K, item: StoreMap[K]): Promise<void> {
  await tx(storeName, "readwrite", (store) => { store.put(item); });
}

export async function deleteItem(storeName: StoreName, id: string): Promise<void> {
  await tx(storeName, "readwrite", (store) => { store.delete(id); });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  await tx(storeName, "readwrite", (store) => { store.clear(); });
}

export async function exportBackup(): Promise<BackupPayload> {
  const stores = await readAllStores();
  const rawSpaces = localStorage.getItem(SPACES_KEY);
  const spaces = rawSpaces ? parseSpaces(JSON.parse(rawSpaces)) : undefined;
  return parseBackup({
    version: 1,
    exportedAt: new Date().toISOString(),
    ...stores,
    ...(spaces ? { spaces } : {}),
  });
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

export async function importBackup(raw: unknown): Promise<void> {
  const backup = parseBackup(raw);
  const previous = await readAllStores();
  localStorage.getItem(SPACES_KEY);

  await replaceStoresAtomically({
    movements: backup.movements,
    fixedExpenses: backup.fixedExpenses,
    products: backup.products,
    purchases: backup.purchases,
  });

  if (backup.spaces) {
    try {
      localStorage.setItem(SPACES_KEY, JSON.stringify(backup.spaces));
    } catch {
      try {
        await replaceStoresAtomically(previous);
      } catch {
        throw new Error("No se pudieron guardar los espacios y tampoco restaurar la base anterior. Descarga un respaldo antes de continuar.");
      }
      throw new Error("No se pudieron guardar los espacios del respaldo. Se restauraron los datos anteriores.");
    }
    window.dispatchEvent(new Event("spaces-restored"));
  }
}
