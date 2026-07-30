import { useMemo, useState, type FormEvent } from "react";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import type { useNutrition } from "../hooks/useNutrition";
import type { CookTaskStatus, MealStatus, Recipe, RecipeInput, RecipeKind } from "../types/nutrition";

type NutritionModel = ReturnType<typeof useNutrition>;
type Tab = "hoy" | "semana" | "cocinar" | "recetas";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "cocinar", label: "Cocinar" },
  { id: "recetas", label: "Recetas" },
];

const recipeKinds: Array<{ id: RecipeKind | "todas"; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "desayuno", label: "Desayuno" },
  { id: "huevos", label: "Huevos" },
  { id: "pollo", label: "Pollo" },
  { id: "cerdo", label: "Cerdo" },
  { id: "carne", label: "Carne" },
  { id: "pasta", label: "Pasta" },
  { id: "arroz", label: "Arroz" },
  { id: "legumbres", label: "Legumbres" },
  { id: "verduras", label: "Verduras" },
  { id: "otros", label: "Otros" },
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

const emptyRecipe: RecipeInput = {
  name: "",
  description: "",
  kind: "otros",
  timeMinutes: 20,
  difficulty: "Fácil",
  servings: 2,
  pricePerServing: 0,
  ingredients: [],
  steps: [],
  fridgeDays: 2,
  freezerMonths: 0,
  tips: "",
  pairsWith: [],
};

function listToText(items: string[]) {
  return items.join("\n");
}

function textToList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function euro(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

function recipeToInput(recipe: Recipe): RecipeInput {
  return {
    name: recipe.name,
    description: recipe.description,
    kind: recipe.kind,
    image: recipe.image,
    timeMinutes: recipe.timeMinutes,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    pricePerServing: recipe.pricePerServing,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    fridgeDays: recipe.fridgeDays,
    freezerMonths: recipe.freezerMonths,
    tips: recipe.tips,
    pairsWith: recipe.pairsWith,
  };
}

function RecipeArt({ recipe }: { recipe: Recipe }) {
  return <div className="h-24 rounded-2xl" style={{ background: recipe.image }} />;
}

function RecipeMini({ recipe }: { recipe: Recipe }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <RecipeArt recipe={recipe} />
      <div>
        <p className="font-black text-slate-950">{recipe.name}</p>
        <p className="mt-1 text-sm text-slate-500">{recipe.description}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
          {recipe.timeMinutes} min · {recipe.servings} raciones · {euro(recipe.pricePerServing)}/ración
        </p>
      </div>
    </div>
  );
}

function RecipeForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Recipe;
  onCancel: () => void;
  onSubmit: (input: RecipeInput) => void;
}) {
  const [form, setForm] = useState<RecipeInput>(initial ? recipeToInput(initial) : emptyRecipe);
  const [ingredients, setIngredients] = useState(listToText(form.ingredients));
  const [steps, setSteps] = useState(listToText(form.steps));
  const [pairsWith, setPairsWith] = useState(listToText(form.pairsWith));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      tips: form.tips.trim(),
      ingredients: textToList(ingredients),
      steps: textToList(steps),
      pairsWith: textToList(pairsWith),
    };
    if (!payload.name || payload.ingredients.length === 0 || payload.steps.length === 0) return;
    onSubmit(payload);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          placeholder="Nombre de la receta"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <select
          className="input"
          value={form.kind}
          onChange={(event) => setForm({ ...form, kind: event.target.value as RecipeKind })}
        >
          {recipeKinds
            .filter((kind) => kind.id !== "todas")
            .map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
        </select>
      </div>

      <textarea
        className="input min-h-24 py-3"
        placeholder="Descripción corta"
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          className="input"
          type="number"
          min="1"
          step="1"
          value={form.timeMinutes}
          onChange={(event) => setForm({ ...form, timeMinutes: Number(event.target.value) })}
          placeholder="Min"
        />
        <input
          className="input"
          type="number"
          min="1"
          step="1"
          value={form.servings}
          onChange={(event) => setForm({ ...form, servings: Number(event.target.value) })}
          placeholder="Raciones"
        />
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={form.pricePerServing}
          onChange={(event) => setForm({ ...form, pricePerServing: Number(event.target.value) })}
          placeholder="€/ración"
        />
        <select
          className="input"
          value={form.difficulty}
          onChange={(event) => setForm({ ...form, difficulty: event.target.value as RecipeInput["difficulty"] })}
        >
          <option>Fácil</option>
          <option>Media</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <textarea
          className="input min-h-32 py-3"
          placeholder={"Ingredientes, uno por línea"}
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
          required
        />
        <textarea
          className="input min-h-32 py-3"
          placeholder={"Pasos, uno por línea"}
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={form.fridgeDays}
          onChange={(event) => setForm({ ...form, fridgeDays: Number(event.target.value) })}
          placeholder="Días nevera"
        />
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={form.freezerMonths}
          onChange={(event) => setForm({ ...form, freezerMonths: Number(event.target.value) })}
          placeholder="Meses congelador"
        />
      </div>

      <textarea
        className="input min-h-24 py-3"
        placeholder={"Combina bien con... uno por línea"}
        value={pairsWith}
        onChange={(event) => setPairsWith(event.target.value)}
      />
      <textarea
        className="input min-h-24 py-3"
        placeholder="Consejo de conservación o preparación"
        value={form.tips}
        onChange={(event) => setForm({ ...form, tips: event.target.value })}
      />

      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-primary" type="submit">
          Guardar receta
        </button>
      </div>
    </form>
  );
}

export function Nutrition({ nutrition }: { nutrition: NutritionModel }) {
  const [activeTab, setActiveTab] = useState<Tab>("recetas");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [isRecipeFormOpen, setIsRecipeFormOpen] = useState(false);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<RecipeKind | "todas">("todas");

  const availablePrepared = useMemo(
    () =>
      nutrition.preparedMeals
        .map((meal) => ({ ...meal, recipe: nutrition.recipeById.get(meal.recipeId) }))
        .filter((meal) => meal.recipe),
    [nutrition.preparedMeals, nutrition.recipeById],
  );

  const filteredRecipes = useMemo(() => {
    const query = recipeQuery.trim().toLowerCase();
    return nutrition.recipes.filter((recipe) => {
      const matchesKind = recipeFilter === "todas" || recipe.kind === recipeFilter;
      const matchesQuery =
        !query ||
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(query));
      return matchesKind && matchesQuery;
    });
  }, [nutrition.recipes, recipeFilter, recipeQuery]);

  function openRecipeForm(recipe?: Recipe) {
    setEditingRecipe(recipe);
    setSelectedRecipe(null);
    setIsRecipeFormOpen(true);
  }

  function closeRecipeForm() {
    setEditingRecipe(undefined);
    setIsRecipeFormOpen(false);
  }

  function saveRecipe(input: RecipeInput) {
    if (editingRecipe) {
      nutrition.updateRecipe(editingRecipe.id, input);
    } else {
      nutrition.addRecipe(input);
    }
    closeRecipeForm();
  }

  function removeRecipe(recipe: Recipe) {
    if (window.confirm(`¿Eliminar la receta "${recipe.name}"?`)) {
      nutrition.deleteRecipe(recipe.id);
      setSelectedRecipe(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-slate-300">Alimentación inteligente</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Tus recetas y tu menú</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Empieza agregando tus propias recetas. Luego puedes usarlas para armar la semana.
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
            <StatCard label="Recetas" value={String(nutrition.recipes.length)} tone="blue" />
            <StatCard label="Preparadas" value={String(availablePrepared.length)} tone="green" />
            <StatCard
              label="Tareas"
              value={String(nutrition.nextCookSession?.tasks.filter((task) => task.status !== "Finalizado").length ?? 0)}
              tone="amber"
            />
          </div>

          <Card>
            <h2 className="text-lg font-black text-slate-950">Menú de hoy</h2>
            <div className="mt-3 space-y-3">
              {nutrition.todayPlan.length > 0 ? (
                nutrition.todayPlan.map((meal) => {
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
                })
              ) : (
                <EmptyState title="Todavía no hay menú" body="Crea recetas y pulsa Generar en Semana para preparar el menú." />
              )}
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
                <EmptyState title="Nada preparado" body="Más adelante podemos añadir control de raciones cocinadas." />
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "semana" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Menú semanal</h2>
              <p className="text-sm text-slate-500">Crea recetas y después genera o cambia cada plato.</p>
            </div>
            <button className="btn-primary shrink-0" type="button" onClick={nutrition.generateWeek}>
              Generar
            </button>
          </div>

          {nutrition.recipes.length === 0 ? (
            <Card>
              <EmptyState title="Primero agrega recetas" body="La semana se arma con tus propias recetas." />
              <button className="btn-primary mt-3 w-full" type="button" onClick={() => setActiveTab("recetas")}>
                Ir a recetas
              </button>
            </Card>
          ) : (
            nutrition.dayLabels.map((day, dayIndex) => (
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
                        ) : (
                          <p className="mt-1 text-sm font-bold text-slate-500">Sin plato</p>
                        )}
                        <select
                          className="input mt-3 h-10 rounded-xl px-3 text-sm"
                          value={meal?.recipeId ?? ""}
                          onChange={(event) => nutrition.updateWeeklyMeal(dayIndex, slot, event.target.value)}
                        >
                          <option value="" disabled>
                            Elegir receta
                          </option>
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
            ))
          )}
        </div>
      ) : null}

      {activeTab === "cocinar" ? (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-950">Cocinar</h2>
          {nutrition.cookSessions.length > 0 ? (
            nutrition.cookSessions.map((session) => (
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
            ))
          ) : (
            <Card>
              <EmptyState title="Sin tareas de cocina" body="Por ahora usa Recetas y Semana. Luego podemos añadir planificación de cocina por raciones." />
            </Card>
          )}
        </div>
      ) : null}

      {activeTab === "recetas" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Recetas</h2>
              <p className="text-sm text-slate-500">Aquí todo lo agregas y editas tú.</p>
            </div>
            <button className="btn-primary shrink-0" type="button" onClick={() => openRecipeForm()}>
              Nueva
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <input
              className="input"
              placeholder="Buscar receta o ingrediente"
              value={recipeQuery}
              onChange={(event) => setRecipeQuery(event.target.value)}
            />
            <select
              className="input"
              value={recipeFilter}
              onChange={(event) => setRecipeFilter(event.target.value as RecipeKind | "todas")}
            >
              {recipeKinds.map((kind) => (
                <option key={kind.id} value={kind.id}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="transition hover:-translate-y-0.5">
                <button className="w-full text-left" type="button" onClick={() => setSelectedRecipe(recipe)}>
                  <RecipeMini recipe={recipe} />
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn-secondary" type="button" onClick={() => openRecipeForm(recipe)}>
                    Editar
                  </button>
                  <button className="btn-danger" type="button" onClick={() => removeRecipe(recipe)}>
                    Eliminar
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <EmptyState title="Aún no tienes recetas" body="Pulsa Nueva y empieza con tus platos reales." />
              <button className="btn-primary mt-3 w-full" type="button" onClick={() => openRecipeForm()}>
                Crear primera receta
              </button>
            </Card>
          )}
        </div>
      ) : null}

      {isRecipeFormOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" onClick={closeRecipeForm}>
          <div
            className="mx-auto max-h-[calc(100dvh-2rem)] max-w-2xl overflow-auto rounded-[1.5rem] bg-white p-4 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{editingRecipe ? "Editar receta" : "Nueva receta"}</h2>
                <p className="text-sm text-slate-500">Ingredientes y pasos van uno por línea.</p>
              </div>
              <button className="btn-secondary shrink-0" type="button" onClick={closeRecipeForm}>
                Cerrar
              </button>
            </div>
            <RecipeForm initial={editingRecipe} onCancel={closeRecipeForm} onSubmit={saveRecipe} />
          </div>
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
              <StatCard label="Ración" value={euro(selectedRecipe.pricePerServing)} tone="slate" />
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
                    <li key={`${step}-${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                      <strong>{index + 1}.</strong> {step}
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h3 className="font-black text-slate-950">Conservación</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Nevera {selectedRecipe.fridgeDays} días · Congelador {selectedRecipe.freezerMonths} meses
                </p>
                {selectedRecipe.pairsWith.length ? (
                  <p className="mt-2 text-sm text-slate-500">Combina con: {selectedRecipe.pairsWith.join(", ")}</p>
                ) : null}
                {selectedRecipe.tips ? <p className="mt-2 text-sm font-semibold text-slate-700">{selectedRecipe.tips}</p> : null}
              </section>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-secondary" type="button" onClick={() => openRecipeForm(selectedRecipe)}>
                  Editar
                </button>
                <button className="btn-danger" type="button" onClick={() => removeRecipe(selectedRecipe)}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
