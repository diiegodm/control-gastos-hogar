import type {
  BackupPayload,
  FixedExpense,
  MarketProduct,
  MarketPurchase,
  Movement,
} from "../types/finance";
import { currentYear, toISODate, todayISO } from "./date";

const DB_NAME = "finanzas-hogar-db";
const DB_VERSION = 1;

type StoreName = "movements" | "fixedExpenses" | "products" | "purchases";

type StoreMap = {
  movements: Movement;
  fixedExpenses: FixedExpense;
  products: MarketProduct;
  purchases: MarketPurchase;
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ["movements", "fixedExpenses", "products", "purchases"] as StoreName[]) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function tx<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);
    let result: T | void;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
    }

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAll<K extends StoreName>(storeName: K): Promise<StoreMap[K][]> {
  return (await tx<StoreMap[K][]>(storeName, "readonly", (store) => store.getAll())) ?? [];
}

export async function putItem<K extends StoreName>(storeName: K, item: StoreMap[K]): Promise<void> {
  await tx(storeName, "readwrite", (store) => {
    store.put(item);
  });
}

export async function deleteItem(storeName: StoreName, id: string): Promise<void> {
  await tx(storeName, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  await tx(storeName, "readwrite", (store) => {
    store.clear();
  });
}

export async function seedIfEmpty(): Promise<void> {
  const existing = await getAll("movements");
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const d = (month: number, day: number) => toISODate(new Date(currentYear, month, day));

  const movements: Movement[] = [
    {
      id: createId("mov"),
      date: d(0, 5),
      type: "Ingreso",
      category: "Otros",
      description: "Salario enero",
      amount: 2500,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("mov"),
      date: d(0, 8),
      type: "Gasto",
      category: "Mercado",
      description: "Compra semanal",
      amount: 124,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("mov"),
      date: d(0, 12),
      type: "Gasto",
      category: "Comidas",
      description: "Cena rápida",
      amount: 22,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("mov"),
      date: d(1, 5),
      type: "Ingreso",
      category: "Otros",
      description: "Salario febrero",
      amount: 2500,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("mov"),
      date: d(1, 14),
      type: "Gasto",
      category: "Mercado",
      description: "Supermercado",
      amount: 168,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("mov"),
      date: todayISO(),
      type: "Ingreso",
      category: "Otros",
      description: "Ingreso del mes",
      amount: 2500,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId("mov"),
      date: todayISO(),
      type: "Gasto",
      category: "Mercado",
      description: "Compra de hoy",
      amount: 92,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const fixedExpenses: FixedExpense[] = [
    { id: createId("fix"), concept: "Renta", amount: 800, payDay: 5, dueDate: d(new Date().getMonth(), 5), status: "Pendiente", createdAt: now, updatedAt: now },
    { id: createId("fix"), concept: "Internet", amount: 35, payDay: 10, dueDate: d(new Date().getMonth(), 10), status: "Pendiente", createdAt: now, updatedAt: now },
    { id: createId("fix"), concept: "Electricidad", amount: 48, payDay: 15, dueDate: d(new Date().getMonth(), 15), status: "Pendiente", createdAt: now, updatedAt: now },
    { id: createId("fix"), concept: "Streaming", amount: 14, payDay: 22, dueDate: d(new Date().getMonth(), 22), status: "Pagado", createdAt: now, updatedAt: now },
  ];

  const products: MarketProduct[] = [
    { id: createId("prd"), product: "Leche", category: "Despensa", lastPrice: 2.4, lastPurchaseDate: d(new Date().getMonth(), 1), currentQty: 1, minQty: 2, createdAt: now, updatedAt: now },
    { id: createId("prd"), product: "Huevos", category: "Despensa", lastPrice: 3.6, lastPurchaseDate: d(new Date().getMonth(), 3), currentQty: 0, minQty: 1, createdAt: now, updatedAt: now },
    { id: createId("prd"), product: "Arroz", category: "Despensa", lastPrice: 4.1, lastPurchaseDate: d(new Date().getMonth(), 2), currentQty: 2, minQty: 1, createdAt: now, updatedAt: now },
    { id: createId("prd"), product: "Papel higiénico", category: "Higiene", lastPrice: 6.8, lastPurchaseDate: d(new Date().getMonth(), 4), currentQty: 1, minQty: 2, createdAt: now, updatedAt: now },
  ];

  const purchases: MarketPurchase[] = products.map((product) => ({
    id: createId("buy"),
    productId: product.id,
    product: product.product,
    price: product.lastPrice,
    date: product.lastPurchaseDate,
    createdAt: now,
  }));

  await Promise.all([
    ...movements.map((item) => putItem("movements", item)),
    ...fixedExpenses.map((item) => putItem("fixedExpenses", item)),
    ...products.map((item) => putItem("products", item)),
    ...purchases.map((item) => putItem("purchases", item)),
  ]);
}

export async function exportBackup(): Promise<BackupPayload> {
  const [movements, fixedExpenses, products, purchases] = await Promise.all([
    getAll("movements"),
    getAll("fixedExpenses"),
    getAll("products"),
    getAll("purchases"),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    movements,
    fixedExpenses,
    products,
    purchases,
  };
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error("El archivo de respaldo no es compatible.");
  }

  await Promise.all([
    clearStore("movements"),
    clearStore("fixedExpenses"),
    clearStore("products"),
    clearStore("purchases"),
  ]);

  await Promise.all([
    ...payload.movements.map((item) => putItem("movements", item)),
    ...payload.fixedExpenses.map((item) => putItem("fixedExpenses", item)),
    ...payload.products.map((item) => putItem("products", item)),
    ...payload.purchases.map((item) => putItem("purchases", item)),
  ]);
}
