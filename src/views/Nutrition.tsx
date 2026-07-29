import { useMemo, useState, type FormEvent } from "react";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import type { useNutrition } from "../hooks/useNutrition";
import type {
  CookTaskStatus,
  FoodNote,
  FoodNoteCategory,
  FoodNoteInput,
  MealStatus,
  Recipe,
  RecipeInput,
  RecipeKind,
} from "../types/nutrition";

type NutritionModel = ReturnType<typeof useNutrition>;
type Tab = "hoy" | "semana" | "cocinar" | "recetas" | "notas";
type RecipeMode = "view" | "form";
type NoteMode = "form";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "cocinar", label: "Cocinar" },
  { id: "recetas", label: "Recetas" },
  { id: "notas", label: "Notas" },
];

const recipeKinds: Array<{ id: RecipeKind | "todas"; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "desayuno", label: "Desayuno" },
  { id: "pollo", label: "Pollo" },
  { id: "carne", label: "Carne" },
  { id: "pasta", label: "Pasta" },
  { id: "arroz", label: "Arroz" },
  { id: "legumbres", label: "Legumbres" },
  { id: "verduras", label: "Verduras" },
  { id: "otros", label: "Otros" },
];

const noteCategories: Array<FoodNoteCategory | "Todas"> = ["Todas", "Cocina", "Compra", "Casa", "Ideas", "Importante"];

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

const emptyNote: FoodNoteInput = {
  title: "",
  category: "Ideas",
  body: "",
  important: false,
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

function noteToInput(note: FoodNote): FoodNoteInput {
  return {
    title: note.title,
    category: note.category,
    body: note.body,
    important: note.important,
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-slate-950">{recipe.name}</p>
          {recipe.isCustom ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.68rem] font-black uppercase text-slate-500">
              Tuya
            </span>
          ) : null}
        </div>
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

function NoteForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: FoodNote;
  onCancel: () => void;
  onSubmit: (input: FoodNoteInput) => void;
}) {
  const [form, setForm] = useState<FoodNoteInput>(initial ? noteToInput(initial) : emptyNote);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    onSubmit({ ...form, title: form.title.trim(), body: form.body.trim() });
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <input
        className="input"
        placeholder="Título"
        value={form.title}
        onChange={(event) => setForm({ ...form, title: event.target.value })}
        required
      />
      <select
        className="input"
        value={form.category}
        onChange={(event) => setForm({ ...form, category: event.target.value as FoodNoteCategory })}
      >
        {noteCategories
          .filter((category) => category !== "Todas")
          .map((category) => (
            <option key={category}>{category}</option>
          ))}
      </select>
      <textarea
        className="input min-h-40 py-3"
        placeholder="Escribe tu nota..."
        value={form.body}
        onChange={(event) => setForm({ ...form, body: event.target.value })}
        required
      />
      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
        <input
          className="h-5 w-5 accent-slate-950"
          type="checkbox"
          checked={form.important}
          onChange={(event) => setForm({ ...form, important: event.target.checked })}
        />
        Marcar como importante
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-primary" type="submit">
          Guardar nota
        </button>
      </div>
    </form>
  );
}

export function Nutrition({ nutrition }: { nutrition: NutritionModel }) {
  const [activeTab, setActiveTab] = useState<Tab>("hoy");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeMode, setRecipeMode] = useState<RecipeMode>("view");
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<RecipeKind | "todas">("todas");
  const [noteMode, setNoteMode] = useState<NoteMode | null>(null);
  const [editingNote, setEditingNote] = useState<FoodNote | undefined>();
  const [noteQuery, setNoteQuery] = useState("");
  const [noteFilter, setNoteFilter] = useState<FoodNoteCategory | "Todas">("Todas");

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

  const filteredNotes = useMemo(() => {
    const query = noteQuery.trim().toLowerCase();
    return nutrition.notes.filter((note) => {
      const matchesCategory =
        noteFilter === "Todas" ||
        note.category === noteFilter ||
        (noteFilter === "Importante" && note.important);
      const matchesQuery =
        !query || note.title.toLowerCase().includes(query) || note.body.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [nutrition.notes, noteFilter, noteQuery]);

  function openRecipeForm(recipe?: Recipe) {
    setEditingRecipe(recipe);
    setRecipeMode("form");
    setSelectedRecipe(null);
  }

  function closeRecipeForm() {
    setEditingRecipe(undefined);
    setRecipeMode("view");
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
    if (!recipe.isCustom) return;
    if (window.confirm(`¿Eliminar la receta "${recipe.name}"?`)) {
      nutrition.deleteRecipe(recipe.id);
      setSelectedRecipe(null);
    }
  }

  function openNoteForm(note?: FoodNote) {
    setEditingNote(note);
    setNoteMode("form");
  }

  function closeNoteForm() {
    setEditingNote(undefined);
    setNoteMode(null);
  }

  function saveNote(input: FoodNoteInput) {
    if (editingNote) {
      nutrition.updateNote(editingNote.id, input);
    } else {
      nutrition.addNote(input);
    }
    closeNoteForm();
  }

  function removeNote(note: FoodNote) {
    if (window.confirm(`¿Eliminar la nota "${note.title}"?`)) {
      nutrition.deleteNote(note.id);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-slate-300">Alimentación inteligente</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Qué comer sin pensar</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Menú semanal, recetas propias, notas y sesiones de cocina en un solo lugar.
        </p>
      </div>

      <div className="grid grid-cols-5 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`h-11 rounded-xl text-xs font-black transition sm:text-sm ${
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
            <StatCard label="Próxima cocina" value={nutrition.nextCookSession?.dayLabel ?? "-"} tone="blue" />
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
              Generar
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Recetas</h2>
              <p className="text-sm text-slate-500">Crea tus platos y úsalos en el menú semanal.</p>
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
                  <button
                    className={recipe.isCustom ? "btn-danger" : "btn-secondary opacity-60"}
                    type="button"
                    disabled={!recipe.isCustom}
                    onClick={() => removeRecipe(recipe)}
                  >
                    Eliminar
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin recetas" body="Prueba con otro filtro o crea una receta nueva." />
          )}
        </div>
      ) : null}

      {activeTab === "notas" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Notas</h2>
              <p className="text-sm text-slate-500">Ideas rápidas de cocina, compra y casa.</p>
            </div>
            <button className="btn-primary shrink-0" type="button" onClick={() => openNoteForm()}>
              Nueva
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <input
              className="input"
              placeholder="Buscar nota"
              value={noteQuery}
              onChange={(event) => setNoteQuery(event.target.value)}
            />
            <select
              className="input"
              value={noteFilter}
              onChange={(event) => setNoteFilter(event.target.value as FoodNoteCategory | "Todas")}
            >
              {noteCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <Card key={note.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{note.title}</h3>
                      {note.important ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                          Importante
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{note.category}</p>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{note.body}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn-secondary" type="button" onClick={() => openNoteForm(note)}>
                    Editar
                  </button>
                  <button className="btn-danger" type="button" onClick={() => removeNote(note)}>
                    Eliminar
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin notas" body="Guarda ideas de menú, compra o cocina para encontrarlas rápido." />
          )}
        </div>
      ) : null}

      {recipeMode === "form" ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" onClick={closeRecipeForm}>
          <div
            className="mx-auto max-h-[calc(100dvh-2rem)] max-w-2xl overflow-auto rounded-[1.5rem] bg-white p-4 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{editingRecipe ? "Editar receta" : "Nueva receta"}</h2>
                <p className="text-sm text-slate-500">Completa solo lo necesario. Ingredientes y pasos van uno por línea.</p>
              </div>
              <button className="btn-secondary shrink-0" type="button" onClick={closeRecipeForm}>
                Cerrar
              </button>
            </div>
            <RecipeForm initial={editingRecipe} onCancel={closeRecipeForm} onSubmit={saveRecipe} />
          </div>
        </div>
      ) : null}

      {noteMode === "form" ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" onClick={closeNoteForm}>
          <div
            className="mx-auto max-h-[calc(100dvh-2rem)] max-w-lg overflow-auto rounded-[1.5rem] bg-white p-4 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{editingNote ? "Editar nota" : "Nueva nota"}</h2>
                <p className="text-sm text-slate-500">Para ideas rápidas, pendientes o apuntes de cocina.</p>
              </div>
              <button className="btn-secondary shrink-0" type="button" onClick={closeNoteForm}>
                Cerrar
              </button>
            </div>
            <NoteForm initial={editingNote} onCancel={closeNoteForm} onSubmit={saveNote} />
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
                <h3 className="font-black text-slate-950">Combina bien con</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRecipe.pairsWith.length ? selectedRecipe.pairsWith.join(", ") : "Sin combinaciones guardadas"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Nevera {selectedRecipe.fridgeDays} días · Congelador {selectedRecipe.freezerMonths} meses
                </p>
                {selectedRecipe.tips ? <p className="mt-2 text-sm font-semibold text-slate-700">{selectedRecipe.tips}</p> : null}
              </section>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-secondary" type="button" onClick={() => openRecipeForm(selectedRecipe)}>
                  Editar
                </button>
                <button
                  className={selectedRecipe.isCustom ? "btn-danger" : "btn-secondary opacity-60"}
                  type="button"
                  disabled={!selectedRecipe.isCustom}
                  onClick={() => removeRecipe(selectedRecipe)}
                >
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
