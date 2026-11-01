import { useEffect, useState } from "react";
import type { BudgetSpace, GoalSpace, SpacesState } from "../types/spaces";
import { movementCategories } from "../types/finance";

const STORAGE_KEY = "finanzas-hogar-spaces-v1";
const EMPTY: SpacesState = { budgets: [], goals: [], budgetCategories: [], goalCategories: [], movementCategories: [] };
type LoadResult = { state: SpacesState; canPersist: boolean; error: string | null };

function id() { return `space_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function load(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: EMPTY, canPersist: true, error: null };
    const parsed = JSON.parse(raw) as Partial<SpacesState> | null;
    const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const stringListValid = (value: unknown) => value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"));
    const budgetListValid = (value: unknown) => Array.isArray(value) && value.every((item) => isRecord(item)
      && typeof item.id === "string" && typeof item.name === "string" && typeof item.category === "string"
      && typeof item.limit === "number" && Number.isFinite(item.limit) && typeof item.archived === "boolean");
    const goalListValid = (value: unknown) => Array.isArray(value) && value.every((item) => isRecord(item)
      && typeof item.id === "string" && typeof item.name === "string" && typeof item.target === "number"
      && Number.isFinite(item.target) && typeof item.saved === "number" && Number.isFinite(item.saved)
      && typeof item.archived === "boolean");
    if (!parsed || !budgetListValid(parsed.budgets) || !goalListValid(parsed.goals)
      || !stringListValid(parsed.budgetCategories) || !stringListValid(parsed.goalCategories) || !stringListValid(parsed.movementCategories)) {
      return { state: EMPTY, canPersist: false, error: "No se pudieron leer tus espacios guardados; no se sobrescribirán." };
    }
    const budgets = parsed?.budgets ?? [];
    const goals = parsed?.goals ?? [];
    return { state: {
      budgets: budgets as BudgetSpace[],
      goals: goals as GoalSpace[],
      budgetCategories: parsed?.budgetCategories ?? [...new Set(budgets.map((item) => item.categoryName).filter((name): name is string => Boolean(name)))],
      goalCategories: parsed?.goalCategories ?? [...new Set(goals.map((item) => item.categoryName).filter((name): name is string => Boolean(name)))],
      movementCategories: parsed?.movementCategories ?? [],
    }, canPersist: true, error: null };
  } catch { return { state: EMPTY, canPersist: false, error: "No se pudieron leer tus espacios guardados; no se sobrescribirán." }; }
}

export function useSpaces() {
  const [initial] = useState(load);
  const [state, setState] = useState(initial.state);
  const [canPersist, setCanPersist] = useState(initial.canPersist);
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  useEffect(() => {
    if (!canPersist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(null);
    } catch {
      setStorageError("No se pudieron guardar los espacios en este dispositivo.");
    }
  }, [canPersist, state]);
  useEffect(() => {
    const reload = () => {
      const loaded = load();
      setState(loaded.state);
      setCanPersist(loaded.canPersist);
      setStorageError(loaded.error);
    };
    window.addEventListener("spaces-restored", reload);
    return () => window.removeEventListener("spaces-restored", reload);
  }, []);

  function saveBudget(input: Omit<BudgetSpace, "id" | "archived">, existingId?: string) {
    setState((current) => ({
      ...current,
      budgetCategories: input.categoryName && !current.budgetCategories.some((name) => name.toLocaleLowerCase("es") === input.categoryName?.toLocaleLowerCase("es"))
        ? [...current.budgetCategories, input.categoryName]
        : current.budgetCategories,
      movementCategories: input.categoryName && !current.movementCategories.some((name) => name.toLocaleLowerCase("es") === input.categoryName?.toLocaleLowerCase("es"))
        ? [...current.movementCategories, input.categoryName]
        : current.movementCategories,
      budgets: existingId
        ? current.budgets.map((item) => item.id === existingId ? { ...item, ...input } : item)
        : [{ ...input, id: id(), archived: false }, ...current.budgets],
    }));
  }

  function addMovementCategory(value: string) {
    const name = value.trim().replace(/\s+/g, " ");
    if (!name) return "";
    const existing = [...movementCategories, ...state.movementCategories, ...state.budgetCategories]
      .find((item) => item.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
    if (existing) return existing;
    setState((current) => ({ ...current, movementCategories: [...current.movementCategories, name] }));
    return name;
  }

  function saveGoal(input: Omit<GoalSpace, "id" | "saved" | "archived">, existingId?: string) {
    setState((current) => ({
      ...current,
      goalCategories: input.categoryName && !current.goalCategories.some((name) => name.toLocaleLowerCase("es") === input.categoryName?.toLocaleLowerCase("es"))
        ? [...current.goalCategories, input.categoryName]
        : current.goalCategories,
      goals: existingId
        ? current.goals.map((item) => item.id === existingId ? { ...item, ...input } : item)
        : [{ ...input, id: id(), saved: 0, archived: false }, ...current.goals],
    }));
  }

  function contribute(goalId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setState((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, saved: goal.saved + amount, contributions: [...(goal.contributions ?? []), { amount, date: new Date().toISOString() }] } : goal) }));
  }

  function archive(kind: "budget" | "goal", spaceId: string) {
    const key = kind === "budget" ? "budgets" : "goals";
    setState((current) => ({ ...current, [key]: current[key].map((space) => space.id === spaceId ? { ...space, archived: true } : space) }));
  }

  function remove(kind: "budget" | "goal", spaceId: string) {
    const key = kind === "budget" ? "budgets" : "goals";
    setState((current) => ({ ...current, [key]: current[key].filter((space) => space.id !== spaceId) }));
  }

  return { ...state, storageError, saveBudget, saveGoal, contribute, archive, remove, addMovementCategory };
}
