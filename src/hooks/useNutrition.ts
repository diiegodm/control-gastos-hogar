import { useEffect, useMemo, useState } from "react";
import type {
  CookSession,
  CookTaskStatus,
  MealSlot,
  MealStatus,
  NutritionState,
  Recipe,
  RecipeInput,
  WeeklyMeal,
} from "../types/nutrition";

const STORAGE_KEY = "finanzas-hogar-nutrition-v2";

const dayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const mealSlots: MealSlot[] = ["Desayuno", "Comida", "Cena"];

const recipeGradients = [
  "linear-gradient(135deg,#dbeafe,#bfdbfe)",
  "linear-gradient(135deg,#dcfce7,#bbf7d0)",
  "linear-gradient(135deg,#fef3c7,#fed7aa)",
  "linear-gradient(135deg,#fee2e2,#fecaca)",
  "linear-gradient(135deg,#f8fafc,#cbd5e1)",
  "linear-gradient(135deg,#e0f2fe,#ccfbf1)",
];

const defaultState: NutritionState = {
  recipes: [],
  preparedMeals: [],
  weeklyPlan: [],
  cookSessions: [],
};

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function createBlankWeek(recipes: Recipe[]): WeeklyMeal[] {
  if (recipes.length === 0) return [];

  const breakfasts = recipes.filter((recipe) => recipe.kind === "desayuno" || recipe.kind === "huevos");
  const meals = recipes.filter((recipe) => recipe.kind !== "desayuno");

  return dayLabels.flatMap((_, day) =>
    mealSlots.map((slot) => {
      const pool = slot === "Desayuno" && breakfasts.length > 0 ? breakfasts : meals.length > 0 ? meals : recipes;
      const recipe = pool[(day + mealSlots.indexOf(slot)) % pool.length];
      return {
        day,
        slot,
        recipeId: recipe.id,
        status: "Pendiente" as MealStatus,
      };
    }),
  );
}

function loadState(): NutritionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<NutritionState>;
    return {
      recipes: parsed.recipes ?? [],
      preparedMeals: parsed.preparedMeals ?? [],
      weeklyPlan: parsed.weeklyPlan ?? [],
      cookSessions: parsed.cookSessions ?? [],
    };
  } catch {
    return defaultState;
  }
}

export function useNutrition() {
  const [state, setState] = useState<NutritionState>(() => loadState());
  const todayIndex = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const recipeById = useMemo(() => new Map(state.recipes.map((recipe) => [recipe.id, recipe])), [state.recipes]);

  const todayPlan = useMemo(
    () =>
      state.weeklyPlan
        .filter((meal) => meal.day === todayIndex && recipeById.has(meal.recipeId))
        .sort((a, b) => mealSlots.indexOf(a.slot) - mealSlots.indexOf(b.slot)),
    [recipeById, state.weeklyPlan, todayIndex],
  );

  const nextCookSession = useMemo(() => {
    return state.cookSessions.find((session) => session.tasks.some((task) => task.status !== "Finalizado")) ?? state.cookSessions[0];
  }, [state.cookSessions]);

  function recipeName(recipeId: string): string {
    return recipeById.get(recipeId)?.name ?? "Sin receta";
  }

  function updateWeeklyMeal(day: number, slot: MealSlot, recipeId: string, status: MealStatus = "Pendiente") {
    setState((current) => {
      const exists = current.weeklyPlan.some((meal) => meal.day === day && meal.slot === slot);
      return {
        ...current,
        weeklyPlan: exists
          ? current.weeklyPlan.map((meal) =>
              meal.day === day && meal.slot === slot ? { ...meal, recipeId, status } : meal,
            )
          : [...current.weeklyPlan, { day, slot, recipeId, status }],
      };
    });
  }

  function updateTaskStatus(sessionId: string, taskId: string, status: CookTaskStatus) {
    setState((current) => ({
      ...current,
      cookSessions: current.cookSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              tasks: session.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
            }
          : session,
      ),
    }));
  }

  function addRecipe(input: RecipeInput) {
    const recipe: Recipe = {
      ...input,
      id: makeId("recipe"),
      image: input.image || recipeGradients[state.recipes.length % recipeGradients.length],
      isCustom: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    setState((current) => ({
      ...current,
      recipes: [recipe, ...current.recipes],
    }));
    return recipe;
  }

  function updateRecipe(id: string, input: RecipeInput) {
    setState((current) => ({
      ...current,
      recipes: current.recipes.map((recipe) =>
        recipe.id === id
          ? {
              ...recipe,
              ...input,
              image: input.image || recipe.image,
              isCustom: true,
              updatedAt: nowISO(),
            }
          : recipe,
      ),
    }));
  }

  function deleteRecipe(id: string) {
    setState((current) => {
      const nextRecipes = current.recipes.filter((recipe) => recipe.id !== id);
      return {
        ...current,
        recipes: nextRecipes,
        preparedMeals: current.preparedMeals.filter((meal) => meal.recipeId !== id),
        weeklyPlan: current.weeklyPlan.filter((meal) => meal.recipeId !== id),
      };
    });
  }

  function generateWeek() {
    setState((current) => ({
      ...current,
      weeklyPlan: createBlankWeek(current.recipes),
    }));
  }

  function addCookSession(session: CookSession) {
    setState((current) => ({ ...current, cookSessions: [session, ...current.cookSessions] }));
  }

  return {
    ...state,
    dayLabels,
    mealSlots,
    todayIndex,
    todayPlan,
    nextCookSession,
    recipeById,
    recipeName,
    updateWeeklyMeal,
    updateTaskStatus,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    generateWeek,
    addCookSession,
  };
}
