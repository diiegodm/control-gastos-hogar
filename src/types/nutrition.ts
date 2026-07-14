export type MealSlot = "Desayuno" | "Comida" | "Cena";

export type MealStatus = "Preparado" | "Pendiente" | "Congelado";

export type CookTaskStatus = "Pendiente" | "En proceso" | "Finalizado";

export type RecipeKind =
  | "pollo"
  | "cerdo"
  | "carne"
  | "legumbres"
  | "pasta"
  | "arroz"
  | "verduras"
  | "huevos"
  | "desayuno";

export type Recipe = {
  id: string;
  name: string;
  description: string;
  kind: RecipeKind;
  image: string;
  timeMinutes: number;
  difficulty: "Fácil" | "Media";
  servings: number;
  pricePerServing: number;
  ingredients: string[];
  steps: string[];
  fridgeDays: number;
  freezerMonths: number;
  tips: string;
  pairsWith: string[];
};

export type PreparedMeal = {
  id: string;
  recipeId: string;
  portions: number;
  status: MealStatus;
  expiresInDays: number;
};

export type WeeklyMeal = {
  day: number;
  slot: MealSlot;
  recipeId: string;
  status: MealStatus;
};

export type CookTask = {
  id: string;
  title: string;
  portions: number;
  estimatedMinutes: number;
  status: CookTaskStatus;
};

export type CookSession = {
  id: string;
  dayLabel: string;
  tasks: CookTask[];
};

export type NutritionState = {
  recipes: Recipe[];
  preparedMeals: PreparedMeal[];
  weeklyPlan: WeeklyMeal[];
  cookSessions: CookSession[];
};
