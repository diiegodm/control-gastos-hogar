import type { FinanceData, FixedExpense, MarketItem, MarketPurchase, Movement } from "../types";
import { seedData } from "./seed";

const DB_NAME = "finanzas-hogar-db";
const DB_VERSION = 1;
const STORES = ["movements", "fixedExpenses", "marketItems", "marketPurchases"] as const;

type StoreName = (typeof STORES)[number];
type StoreMap = {
  movements: Movement;
  fixedExpenses: FixedExpense;
  marketItems: MarketItem;
  marketPurchases: MarketPurchase;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(storeName: StoreName, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function getAll<K extends StoreName>(storeName: K): Promise<StoreMap[K][]> {
  return tx<StoreMap[K][]>(storeName, "readonly", (store) => store.getAll());
}

export async function putItem<K extends StoreName>(storeName: K, item: StoreMap[K]) {
  await tx<IDBValidKey>(storeName, "readwrite", (store) => store.put(item));
}

export async function deleteItem(storeName: StoreName, id: string) {
  await tx<undefined>(storeName, "readwrite", (store) => store.delete(id));
}

async function clearStore(storeName: StoreName) {
  await tx<undefined>(storeName, "readwrite", (store) => store.clear());
}

export async function loadAll(): Promise<FinanceData> {
  const [movements, fixedExpenses, marketItems, marketPurchases] = await Promise.all([
    getAll("movements"),
    getAll("fixedExpenses"),
    getAll("marketItems"),
    getAll("marketPurchases"),
  ]);
  if (!movements.length && !fixedExpenses.length && !marketItems.length && !marketPurchases.length) {
    await importAll(seedData);
    return seedData;
  }
  return { movements, fixedExpenses, marketItems, marketPurchases };
}

export async function importAll(data: FinanceData) {
  for (const store of STORES) {
    await clearStore(store);
  }
  for (const movement of data.movements ?? []) await putItem("movements", movement);
  for (const fixedExpense of data.fixedExpenses ?? []) await putItem("fixedExpenses", fixedExpense);
  for (const marketItem of data.marketItems ?? []) await putItem("marketItems", marketItem);
  for (const purchase of data.marketPurchases ?? []) await putItem("marketPurchases", purchase);
}
