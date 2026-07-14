import { useMemo, useState } from "react";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import type { useNutrition } from "../hooks/useNutrition";
import type { CookTaskStatus, MealStatus, Recipe } from "../types/nutrition";

type NutritionModel = ReturnType<typeof useNutrition>;
type Tab = "hoy" | "semana" | "cocinar" | "recetas";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "cocinar", label: "Cocinar" },
  { id: "recetas", label: "Recetas" },
];

const statusClass: Record<MealStatus, string> = {
  Preparado: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
  Congelado: "bg-blue-50 text-blue-700",
};

const taskStatusClass: Record<CookTaskStatus, string> = {
  Pendiente: "bg-amber-50 text-amber-700",
  "En proceso": "bg-blue-50 text-blue-700",
  Finalizado: "bg-emerald-50 text-emerald-700",
};

function RecipeArt({ recipe }: { recipe: Recipe }) {
  return (
    <div
      className="h-24 rounded-2xl"
      style={{
        background: recipe.image,
      }}
    />
  );
}

function RecipeMini({ recipe }: { recipe: Recipe }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <RecipeArt recipe={recipe} />
      <div>
        <p className="font-black text-slate-950">{recipe.name}</p>
        <p className="mt-1 text-sm text-slate-500">{recipe.description}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
          {recipe.timeMinutes} min · {recipe.servings} raciones
        </p>
      </div>
    </div>
  );
}

export function Nutrition({ nutrition }: { nutrition: NutritionModel }) {
  const [activeTab, setActiveTab] = useState<Tab>("hoy");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const availablePrepared = useMemo(
    () =>
      nutrition.preparedMeals
        .map((meal) => ({ ...meal, recipe: nutrition.recipeById.get(meal.recipeId) }))
        .filter((meal) => meal.recipe),
    [nutrition.preparedMeals, nutrition.recipeById],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-slate-300">Alimentación inteligente</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Qué comer sin pensar</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Menú semanal, comida preparada y sesiones de cocina en un solo lugar.
        </p>
      </div>

      <div className="grid grid-cols-4 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`h-11 rounded-xl text-sm font-black transition ${
              activeTab === tab.id ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "hoy" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Preparadas" value={String(availablePrepared.length)} tone="green" />
            <StatCard
              label="Próxima cocina"
              value={nutrition.nextCookSession?.dayLabel ?? "-"}
              tone="blue"
            />
            <StatCard
              label="Tareas"
              value={String(nutrition.nextCookSession?.tasks.filter((task) => task.status !== "Finalizado").length ?? 0)}
              tone="amber"
            />
          </div>

          <Card>
            <h2 className="text-lg font-black text-slate-950">Menú de hoy</h2>
            <div className="mt-3 space-y-3">
              {nutrition.todayPlan.map((meal) => {
                const recipe = nutrition.recipeById.get(meal.recipeId);
                if (!recipe) return null;
                return (
                  <button
                    key={`${meal.day}-${meal.slot}`}
                    className="w-full rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
                    type="button"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{meal.slot}</p>
                        <p className="mt-1 font-black text-slate-950">{recipe.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{recipe.timeMinutes} min · {recipe.description}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[meal.status]}`}>
                        {meal.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-slate-950">Comida preparada</h2>
            <div className="mt-3 space-y-2">
              {availablePrepared.length > 0 ? (
                availablePrepared.map((meal) => (
                  <div key={meal.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <div>
                      <p className="font-bold text-slate-950">{meal.recipe?.name}</p>
                      <p className="text-sm text-slate-500">
                        {meal.portions} raciones · {meal.status === "Congelado" ? "Congelado" : `caduca en ${meal.expiresInDays} días`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[meal.status]}`}>
                      {meal.status}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState title="Nada preparado" body="Cuando cocines raciones aparecerán aquí." />
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-slate-950">Próxima sesión de cocina</h2>
            <p className="mt-1 text-sm text-slate-500">{nutrition.nextCookSession?.dayLabel}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {nutrition.nextCookSession?.tasks.map((task) => (
                <span key={task.id} className="rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                  {task.title}
                </span>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "semana" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Menú semanal</h2>
              <p className="text-sm text-slate-500">Pulsa una receta para ver detalles. Cambia platos desde el selector.</p>
            </div>
            <button className="btn-primary shrink-0" type="button" onClick={nutrition.generateWeek}>
              Generar semana
            </button>
          </div>
          {nutrition.dayLabels.map((day, dayIndex) => (
            <Card key={day} className={dayIndex === nutrition.todayIndex ? "ring-2 ring-slate-950" : ""}>
              <h3 className="font-black text-slate-950">{day}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {nutrition.mealSlots.map((slot) => {
                  const meal = nutrition.weeklyPlan.find((item) => item.day === dayIndex && item.slot === slot);
                  const recipe = meal ? nutrition.recipeById.get(meal.recipeId) : undefined;
                  return (
                    <div key={slot} className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{slot}</p>
                      {recipe ? (
                        <button className="mt-1 text-left font-black text-slate-950" type="button" onClick={() => setSelectedRecipe(recipe)}>
                          {recipe.name}
                        </button>
                      ) : null}
                      <select
                        className="input mt-3 h-10 rounded-xl px-3 text-sm"
                        value={meal?.recipeId ?? ""}
                        onChange={(event) => nutrition.updateWeeklyMeal(dayIndex, slot, event.target.value)}
                      >
                        {nutrition.recipes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "cocinar" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-950">Batch cooking</h2>
          {nutrition.cookSessions.map((session) => (
            <Card key={session.id}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-950">{session.dayLabel}</h3>
                <p className="text-sm font-bold text-slate-500">
                  {session.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)} min estimados
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {session.tasks.map((task) => (
                  <div key={task.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_9rem]">
                    <div>
                      <p className="font-black text-slate-950">{task.title}</p>
                      <p className="text-sm text-slate-500">
                        {task.portions} raciones · {task.estimatedMinutes} min
                      </p>
                    </div>
                    <select
                      className={`input h-10 rounded-xl px-3 text-sm ${taskStatusClass[task.status]}`}
                      value={task.status}
                      onChange={(event) => nutrition.updateTaskStatus(session.id, task.id, event.target.value as CookTaskStatus)}
                    >
                      <option>Pendiente</option>
                      <option>En proceso</option>
                      <option>Finalizado</option>
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "recetas" ? (
        <div className="space-y-3">
          <h2 className="text-xl font-black text-slate-950">Recetas</h2>
          {nutrition.recipes.map((recipe) => (
            <button key={recipe.id} className="w-full text-left" type="button" onClick={() => setSelectedRecipe(recipe)}>
              <Card className="transition hover:-translate-y-0.5">
                <RecipeMini recipe={recipe} />
              </Card>
            </button>
          ))}
        </div>
      ) : null}

      {selectedRecipe ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setSelectedRecipe(null)}>
          <div
            className="mx-auto max-h-[calc(100dvh-2rem)] max-w-lg overflow-auto rounded-[1.5rem] bg-white p-4 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <RecipeArt recipe={selectedRecipe} />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{selectedRecipe.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedRecipe.description}</p>
              </div>
              <button className="btn-secondary shrink-0" type="button" onClick={() => setSelectedRecipe(null)}>
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatCard label="Tiempo" value={`${selectedRecipe.timeMinutes}m`} tone="blue" />
              <StatCard label="Raciones" value={String(selectedRecipe.servings)} tone="green" />
              <StatCard label="Ración" value={`€${selectedRecipe.pricePerServing}`} tone="slate" />
            </div>
            <div className="mt-4 grid gap-4">
              <section>
                <h3 className="font-black text-slate-950">Ingredientes</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <span key={ingredient} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                      {ingredient}
                    </span>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="font-black text-slate-950">Preparación</h3>
                <ol className="mt-2 space-y-2">
                  {selectedRecipe.steps.map((step, index) => (
                    <li key={step} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                      <strong>{index + 1}.</strong> {step}
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h3 className="font-black text-slate-950">Combina bien con</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedRecipe.pairsWith.join(", ")}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Nevera {selectedRecipe.fridgeDays} días · Congelador {selectedRecipe.freezerMonths} meses
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{selectedRecipe.tips}</p>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
