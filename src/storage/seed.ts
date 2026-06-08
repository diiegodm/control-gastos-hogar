import type { FinanceData } from "../types";
import { makeId } from "../utils/date";

const now = new Date().toISOString();

export const seedData: FinanceData = {
  movements: [
    { id: makeId("mov"), date: "2026-06-01", type: "Ingreso", category: "Otros", description: "Salario", amount: 2500, createdAt: now },
    { id: makeId("mov"), date: "2026-06-02", type: "Gasto", category: "Mercado", description: "Supermercado semanal", amount: 82.35, createdAt: now },
    { id: makeId("mov"), date: "2026-06-03", type: "Gasto", category: "Transporte", description: "Gasolina", amount: 45, createdAt: now },
    { id: makeId("mov"), date: "2026-06-04", type: "Gasto", category: "Comidas", description: "Cena fuera", amount: 28.5, createdAt: now },
    { id: makeId("mov"), date: "2026-06-05", type: "Gasto", category: "Mascotas", description: "Alimento mascota", amount: 31.9, createdAt: now },
    { id: makeId("mov"), date: "2026-06-06", type: "Gasto", category: "Salud", description: "Farmacia", amount: 18.75, createdAt: now },
    { id: makeId("mov"), date: "2026-06-07", type: "Gasto", category: "Entretenimiento", description: "Cine", amount: 22, createdAt: now },
    { id: makeId("mov"), date: "2026-06-08", type: "Gasto", category: "Mercado", description: "Frutas y verduras", amount: 36.2, createdAt: now },
  ],
  fixedExpenses: [
    { id: makeId("fix"), concept: "Renta", amount: 850, paymentDay: 1, dueDate: "2026-06-01", createdAt: now },
    { id: makeId("fix"), concept: "Internet", amount: 45, paymentDay: 10, dueDate: "2026-06-10", createdAt: now },
    { id: makeId("fix"), concept: "Teléfono", amount: 30, paymentDay: 15, dueDate: "2026-06-15", createdAt: now },
    { id: makeId("fix"), concept: "Gimnasio", amount: 35, paymentDay: 20, dueDate: "2026-06-20", createdAt: now },
    { id: makeId("fix"), concept: "Streaming", amount: 18, paymentDay: 22, dueDate: "2026-06-22", createdAt: now },
    { id: makeId("fix"), concept: "Seguro", amount: 120, paymentDay: 25, dueDate: "2026-06-25", createdAt: now },
    { id: makeId("fix"), concept: "Agua", amount: 28, paymentDay: 28, dueDate: "2026-06-28", createdAt: now },
    { id: makeId("fix"), concept: "Electricidad", amount: 65, paymentDay: 30, dueDate: "2026-06-30", createdAt: now },
  ],
  marketItems: [
    { id: makeId("itm"), product: "Leche", category: "Lácteos", lastPrice: 2.5, lastPurchaseDate: "2026-06-05", currentQty: 1, minQty: 2, createdAt: now },
    { id: makeId("itm"), product: "Huevos", category: "Despensa", lastPrice: 4, lastPurchaseDate: "2026-06-03", currentQty: 12, minQty: 6, createdAt: now },
    { id: makeId("itm"), product: "Café", category: "Despensa", lastPrice: 6.8, lastPurchaseDate: "2026-06-01", currentQty: 0, minQty: 1, createdAt: now },
    { id: makeId("itm"), product: "Papel higiénico", category: "Limpieza", lastPrice: 7.9, lastPurchaseDate: "2026-05-28", currentQty: 3, minQty: 4, createdAt: now },
    { id: makeId("itm"), product: "Pollo", category: "Carnes", lastPrice: 9.6, lastPurchaseDate: "2026-06-04", currentQty: 1, minQty: 2, createdAt: now },
  ],
  marketPurchases: [
    { id: makeId("buy"), itemId: "seed", product: "Supermercado semanal", price: 82.35, quantity: 1, date: "2026-06-02", createdAt: now },
    { id: makeId("buy"), itemId: "seed", product: "Frutas y verduras", price: 36.2, quantity: 1, date: "2026-06-08", createdAt: now },
  ],
};
