export type MonthKey =
  | "enero"
  | "febrero"
  | "marzo"
  | "abril"
  | "mayo"
  | "junio"
  | "julio"
  | "agosto"
  | "septiembre"
  | "octubre"
  | "noviembre"
  | "diciembre";

export type Category =
  | "Mercado"
  | "Transporte"
  | "Comidas"
  | "Entretenimiento"
  | "Salud"
  | "Mascotas"
  | "Ropa"
  | "Otros";

export type MovementType = "Ingreso" | "Gasto";

export type Movement = {
  id: string;
  date: string;
  type: MovementType;
  category: Category;
  description: string;
  amount: number;
  createdAt: string;
};

export type FixedExpense = {
  id: string;
  concept: string;
  amount: number;
  paymentDay: number;
  dueDate: string;
  createdAt: string;
};

export type MarketItem = {
  id: string;
  product: string;
  category: string;
  lastPrice: number;
  lastPurchaseDate: string;
  currentQty: number;
  minQty: number;
  createdAt: string;
};

export type MarketPurchase = {
  id: string;
  itemId: string;
  product: string;
  price: number;
  quantity: number;
  date: string;
  createdAt: string;
};

export type FinanceData = {
  movements: Movement[];
  fixedExpenses: FixedExpense[];
  marketItems: MarketItem[];
  marketPurchases: MarketPurchase[];
};

export type AppSection = "dashboard" | "movimientos" | "fijos" | "mercado";
