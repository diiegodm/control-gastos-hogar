import { useEffect, useMemo, useState } from "react";
import type {
  CookSession,
  CookTaskStatus,
  FoodNote,
  FoodNoteInput,
  MealSlot,
  MealStatus,
  NutritionState,
  PreparedMeal,
  Recipe,
  RecipeInput,
  WeeklyMeal,
} from "../types/nutrition";

const STORAGE_KEY = "finanzas-hogar-nutrition-v1";

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

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

const recipes: Recipe[] = [
  {
    id: "r_desayuno_avena",
    name: "Avena con yogur y fruta",
    description: "Desayuno rápido, fresco y saciante para días de trabajo.",
    kind: "desayuno",
    image: "linear-gradient(135deg,#fef3c7,#fed7aa)",
    timeMinutes: 6,
    difficulty: "Fácil",
    servings: 1,
    pricePerServing: 1.4,
    ingredients: ["Avena", "Yogur", "Plátano", "Canela"],
    steps: ["Mezclar yogur y avena.", "Añadir fruta cortada.", "Terminar con canela."],
    fridgeDays: 1,
    freezerMonths: 0,
    tips: "Puedes dejarlo listo la noche anterior.",
    pairsWith: ["Café", "Frutos secos"],
  },
  {
    id: "r_desayuno_tostada",
    name: "Tostada de huevo",
    description: "Desayuno caliente para empezar con más energía.",
    kind: "huevos",
    image: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
    timeMinutes: 10,
    difficulty: "Fácil",
    servings: 1,
    pricePerServing: 1.8,
    ingredients: ["Pan", "Huevo", "Aceite de oliva", "Sal"],
    steps: ["Tostar el pan.", "Hacer el huevo.", "Montar y servir."],
    fridgeDays: 0,
    freezerMonths: 0,
    tips: "Ideal para días de gimnasio o mucho movimiento.",
    pairsWith: ["Tomate", "Aguacate"],
  },
  {
    id: "r_pollo_horno",
    name: "Pollo al horno",
    description: "Base perfecta para varios platos durante la semana.",
    kind: "pollo",
    image: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
    timeMinutes: 45,
    difficulty: "Fácil",
    servings: 4,
    pricePerServing: 2.3,
    ingredients: ["Pollo", "Pimentón", "Ajo", "Aceite", "Sal"],
    steps: ["Condimentar el pollo.", "Hornear hasta dorar.", "Separar en raciones."],
    fridgeDays: 3,
    freezerMonths: 3,
    tips: "Guarda una parte en nevera y otra congelada.",
    pairsWith: ["Arroz blanco", "Patatas", "Ensalada"],
  },
  {
    id: "r_lentejas",
    name: "Lentejas guisadas",
    description: "Comida preparada que aguanta bien y congela excelente.",
    kind: "legumbres",
    image: "linear-gradient(135deg,#fde68a,#fca5a5)",
    timeMinutes: 55,
    difficulty: "Media",
    servings: 5,
    pricePerServing: 1.6,
    ingredients: ["Lentejas", "Zanahoria", "Pimiento", "Cebolla", "Caldo"],
    steps: ["Preparar sofrito.", "Añadir lentejas y caldo.", "Cocer y dividir raciones."],
    fridgeDays: 4,
    freezerMonths: 4,
    tips: "Congela en porciones individuales.",
    pairsWith: ["Arroz", "Ensalada"],
  },
  {
    id: "r_arroz",
    name: "Arroz blanco",
    description: "Acompañamiento base para montar platos en pocos minutos.",
    kind: "arroz",
    image: "linear-gradient(135deg,#f8fafc,#cbd5e1)",
    timeMinutes: 18,
    difficulty: "Fácil",
    servings: 4,
    pricePerServing: 0.4,
    ingredients: ["Arroz", "Agua", "Sal", "Aceite"],
    steps: ["Lavar arroz.", "Cocer.", "Enfriar y guardar."],
    fridgeDays: 3,
    freezerMonths: 1,
    tips: "Enfriar rápido y guardar en recipientes bajos.",
    pairsWith: ["Pollo al horno", "Lentejas", "Verduras"],
  },
  {
    id: "r_pasta_tomate",
    name: "Pasta con tomate",
    description: "Cena rápida cuando no quieres pensar demasiado.",
    kind: "pasta",
    image: "linear-gradient(135deg,#fee2e2,#fecaca)",
    timeMinutes: 20,
    difficulty: "Fácil",
    servings: 2,
    pricePerServing: 1.2,
    ingredients: ["Pasta", "Tomate", "Queso", "Orégano"],
    steps: ["Cocer pasta.", "Calentar salsa.", "Mezclar y servir."],
    fridgeDays: 2,
    freezerMonths: 1,
    tips: "Mejor guardar pasta y salsa por separado.",
    pairsWith: ["Ensalada", "Pollo"],
  },
  {
    id: "r_verduras",
    name: "Verduras salteadas",
    description: "Base ligera para combinar con proteína o arroz.",
    kind: "verduras",
    image: "linear-gradient(135deg,#bbf7d0,#99f6e4)",
    timeMinutes: 25,
    difficulty: "Fácil",
    servings: 3,
    pricePerServing: 1.1,
    ingredients: ["Pimiento", "Calabacín", "Cebolla", "Aceite"],
    steps: ["Cortar verduras.", "Saltear fuerte.", "Guardar en raciones."],
    fridgeDays: 3,
    freezerMonths: 2,
    tips: "Congela ya cortado si quieres ahorrar tiempo.",
    pairsWith: ["Arroz", "Huevos", "Pollo"],
  },
];

function initialWeeklyPlan(): WeeklyMeal[] {
  const lunchDinner = ["r_pollo_horno", "r_lentejas", "r_pasta_tomate", "r_verduras", "r_arroz", "r_pollo_horno", "r_lentejas"];
  return dayLabels.flatMap((_, day) =>
    mealSlots.map((slot) => ({
      day,
      slot,
      recipeId:
        slot === "Desayuno"
          ? day % 2 === 0
            ? "r_desayuno_avena"
            : "r_desayuno_tostada"
          : slot === "Comida"
            ? lunchDinner[day]
            : lunchDinner[(day + 2) % lunchDinner.length],
      status: day < 2 ? "Preparado" : day === 2 ? "Congelado" : "Pendiente",
    })),
  );
}

const defaultState: NutritionState = {
  recipes,
  notes: [
    {
      id: "note_batch",
      title: "Ideas para cocinar el domingo",
      category: "Ideas",
      body: "Preparar una base de arroz, una proteína y una verdura para resolver comidas rápidas.",
      important: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  ],
  preparedMeals: [
    { id: "p_pollo", recipeId: "r_pollo_horno", portions: 3, status: "Preparado", expiresInDays: 2 },
    { id: "p_lentejas", recipeId: "r_lentejas", portions: 4, status: "Congelado", expiresInDays: 30 },
    { id: "p_arroz", recipeId: "r_arroz", portions: 2, status: "Preparado", expiresInDays: 1 },
  ],
  weeklyPlan: initialWeeklyPlan(),
  cookSessions: [
    {
      id: "cook_sunday",
      dayLabel: "Domingo",
      tasks: [
        { id: "task_pollo", title: "Pollo al horno", portions: 4, estimatedMinutes: 45, status: "Pendiente" },
        { id: "task_arroz", title: "Arroz blanco", portions: 4, estimatedMinutes: 18, status: "Pendiente" },
        { id: "task_lentejas", title: "Lentejas", portions: 5, estimatedMinutes: 55, status: "Pendiente" },
      ],
    },
    {
      id: "cook_wednesday",
      dayLabel: "Miércoles",
      tasks: [
        { id: "task_pasta", title: "Pasta", portions: 2, estimatedMinutes: 20, status: "Pendiente" },
        { id: "task_verduras", title: "Verduras salteadas", portions: 3, estimatedMinutes: 25, status: "Pendiente" },
      ],
    },
  ],
};

function loadState(): NutritionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as NutritionState;
    return {
      recipes: parsed.recipes?.length ? parsed.recipes : defaultState.recipes,
      preparedMeals: parsed.preparedMeals ?? defaultState.preparedMeals,
      weeklyPlan: parsed.weeklyPlan?.length ? parsed.weeklyPlan : defaultState.weeklyPlan,
      cookSessions: parsed.cookSessions?.length ? parsed.cookSessions : defaultState.cookSessions,
      notes: parsed.notes ?? defaultState.notes,
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
        .filter((meal) => meal.day === todayIndex)
        .sort((a, b) => mealSlots.indexOf(a.slot) - mealSlots.indexOf(b.slot)),
    [state.weeklyPlan, todayIndex],
  );

  const nextCookSession = useMemo(() => {
    return state.cookSessions.find((session) => session.tasks.some((task) => task.status !== "Finalizado")) ?? state.cookSessions[0];
  }, [state.cookSessions]);

  function recipeName(recipeId: string): string {
    return recipeById.get(recipeId)?.name ?? "Sin receta";
  }

  function updateWeeklyMeal(day: number, slot: MealSlot, recipeId: string, status: MealStatus = "Pendiente") {
    setState((current) => ({
      ...current,
      weeklyPlan: current.weeklyPlan.map((meal) =>
        meal.day === day && meal.slot === slot ? { ...meal, recipeId, status } : meal,
      ),
    }));
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
    setState((current) => ({ ...current, recipes: [recipe, ...current.recipes] }));
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
              updatedAt: nowISO(),
            }
          : recipe,
      ),
    }));
  }

  function deleteRecipe(id: string) {
    setState((current) => {
      const fallbackRecipeId = current.recipes.find((recipe) => recipe.id !== id)?.id;
      if (!fallbackRecipeId) return current;
      return {
        ...current,
        recipes: current.recipes.filter((recipe) => recipe.id !== id),
        preparedMeals: current.preparedMeals.filter((meal) => meal.recipeId !== id),
        weeklyPlan: current.weeklyPlan.map((meal) =>
          meal.recipeId === id ? { ...meal, recipeId: fallbackRecipeId, status: "Pendiente" } : meal,
        ),
      };
    });
  }

  function addNote(input: FoodNoteInput) {
    const timestamp = nowISO();
    setState((current) => ({
      ...current,
      notes: [
        {
          ...input,
          id: makeId("note"),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ...current.notes,
      ],
    }));
  }

  function updateNote(id: string, input: FoodNoteInput) {
    setState((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === id ? { ...note, ...input, updatedAt: nowISO() } : note)),
    }));
  }

  function deleteNote(id: string) {
    setState((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
  }

  function generateWeek() {
    const lunchDinner = state.recipes.filter((recipe) => recipe.kind !== "desayuno");
    const breakfasts = state.recipes.filter((recipe) => recipe.kind === "desayuno" || recipe.id.startsWith("r_desayuno"));
    const plan: WeeklyMeal[] = dayLabels.flatMap((_, day) =>
      mealSlots.map((slot) => {
        const pool = slot === "Desayuno" ? breakfasts : lunchDinner;
        const recipe = pool[(day * 2 + mealSlots.indexOf(slot)) % pool.length] ?? state.recipes[0];
        return {
          day,
          slot,
          recipeId: recipe.id,
          status: day <= 1 ? "Preparado" : "Pendiente",
        };
      }),
    );

    setState((current) => ({ ...current, weeklyPlan: plan }));
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
    addNote,
    updateNote,
    deleteNote,
    generateWeek,
  };
}
