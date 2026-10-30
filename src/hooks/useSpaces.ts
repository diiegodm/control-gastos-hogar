import { useEffect, useState } from "react";
import type { BudgetSpace, GoalSpace, SpacesState } from "../types/spaces";

const STORAGE_KEY = "finanzas-hogar-spaces-v1";
const EMPTY: SpacesState = { budgets: [], goals: [] };

function id() { return `space_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function load(): SpacesState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<SpacesState> | null;
    return { budgets: parsed?.budgets ?? [], goals: parsed?.goals ?? [] };
  } catch { return EMPTY; }
}

export function useSpaces() {
  const [state, setState] = useState(load);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);
  useEffect(() => {
    const reload = () => setState(load());
    window.addEventListener("spaces-restored", reload);
    return () => window.removeEventListener("spaces-restored", reload);
  }, []);

  function saveBudget(input: Omit<BudgetSpace, "id" | "archived">, existingId?: string) {
    setState((current) => ({
      ...current,
      budgets: existingId
        ? current.budgets.map((item) => item.id === existingId ? { ...item, ...input } : item)
        : [{ ...input, id: id(), archived: false }, ...current.budgets],
    }));
  }

  function saveGoal(input: Omit<GoalSpace, "id" | "saved" | "archived">, existingId?: string) {
    setState((current) => ({
      ...current,
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

  return { ...state, saveBudget, saveGoal, contribute, archive, remove };
}
