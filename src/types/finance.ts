export type MovementType = "Ingreso" | "Gasto";

export type MovementCategory =
  | "Mercado"
  | "Transporte"
  | "Comidas"
  | "Entretenimiento"
  | "Salud"
  | "Mascotas"
  | "Ropa"
  | "Otros";

export type FixedStatus = "Pendiente" | "Pagado";

export type ProductCategory =
  | "Despensa"
  | "Limpieza"
  | "Higiene"
  | "Mascotas"
  | "Bebidas"
  | "Otros";

export type MonthOption = {
  value: number;
  label: string;
  shortLabel: string;
};

export type Movement = {
  id: string;
  date: string;
  type: MovementType;
  category: MovementCategory;
  description: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
};

export type FixedExpense = {
  id: string;
  concept: string;
  amount: number;
  payDay: number;
  dueDate: string;
  status: FixedStatus;
  createdAt: string;
  updatedAt: string;
};

export type MarketProduct = {
  id: string;
  product: string;
  category: ProductCategory;
  lastPrice: number;
  lastPurchaseDate: string;
  currentQty: number;
  minQty: number;
  createdAt: string;
  updatedAt: string;
};

export type MarketPurchase = {
  id: string;
  productId: string;
  product: string;
  price: number;
  date: string;
  createdAt: string;
};

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  movements: Movement[];
  fixedExpenses: FixedExpense[];
  products: MarketProduct[];
  purchases: MarketPurchase[];
};

export const movementCategories: MovementCategory[] = [
  "Mercado",
  "Transporte",
  "Comidas",
  "Entretenimiento",
  "Salud",
  "Mascotas",
  "Ropa",
  "Otros",
];

export const productCategories: ProductCategory[] = [
  "Despensa",
  "Limpieza",
  "Higiene",
  "Mascotas",
  "Bebidas",
  "Otros",
];

export const fixedConcepts = [
  "Renta",
  "Internet",
  "Teléfono",
  "Gimnasio",
  "Streaming",
  "Seguro",
  "Agua",
  "Electricidad",
];
