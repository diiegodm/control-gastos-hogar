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
  source?: "market" | "ticket";
  purchaseId?: string;
  ticketId?: string;
  fixedPaymentId?: string;
  goalId?: string;
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

export type ReceiptLine = {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  inventoryAction: "ignore" | "update" | "create";
  productId?: string;
  category: ProductCategory;
  ocrConfidence?: number;
  reviewRequired?: boolean;
};

export type ReceiptTicket = {
  id: string;
  storeName: string;
  date: string;
  subtotalCents?: number;
  taxCents?: number;
  discountCents?: number;
  totalCents: number;
  lines: ReceiptLine[];
  rawText?: string;
  fingerprint?: string;
  movementId: string;
  createdAt: string;
};

export type BackupPayload = {
  version: 6;
  exportedAt: string;
  movements: Movement[];
  fixedExpenses: FixedExpense[];
  fixedPayments: FixedPayment[];
  products: MarketProduct[];
  purchases: MarketPurchase[];
  tickets: ReceiptTicket[];
  spaces: import("./spaces").SpacesState;
  notes: import("./notes").Note[];
  checklistIds: string[];
  financialSettings: FinancialSettings;
  mascotProfile: import("./mascot").MascotProfile;
  mascotEvents: import("./mascot").MascotEvent[];
  notifications: import("./notifications").FinancialAlert[];
  notificationPreferences: import("./notifications").NotificationPreferences;
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
