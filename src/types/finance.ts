export type MovementType = "Ingreso" | "Gasto";

export type MovementCategory =
  | "Mercado"
  | "Transporte"
  | "Comidas"
  | "Entretenimiento"
  | "Salud"
  | "Mascotas"
  | "Ropa"
  | "Otros"
  | (string & {});

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
  budgetSpaceId?: string;
  source?: "market";
  purchaseId?: string;
  fixedPaymentId?: string;
  generatedByFixedPayment?: boolean;
  description: string;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
};

export type FixedExpense = {
  id: string;
  concept: string;
  category?: MovementCategory;
  amountCents: number;
  payDay: number;
  startMonth: string;
  endMonth?: string;
  createdAt: string;
  updatedAt: string;
};

export type FixedPayment = {
  id: string;
  expenseId: string;
  month: string;
  paidAt: string;
  amountCents: number;
  movementId?: string;
};

export type FinancialSettings = {
  openingBalanceCents: number;
  trackingStartMonth: string;
};

export type MarketProduct = {
  id: string;
  product: string;
  category: ProductCategory;
  lastUnitPriceCents: number;
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
  totalCents: number;
  quantity?: number;
  unitPriceCents?: number;
  priceMode?: "total" | "unit";
  date: string;
  createdAt: string;
};

export type BackupPayload = {
  version: 3;
  exportedAt: string;
  movements: Movement[];
  fixedExpenses: FixedExpense[];
  fixedPayments: FixedPayment[];
  products: MarketProduct[];
  purchases: MarketPurchase[];
  spaces: import("./spaces").SpacesState;
  notes: import("./notes").Note[];
  checklistIds: string[];
  financialSettings: FinancialSettings;
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
