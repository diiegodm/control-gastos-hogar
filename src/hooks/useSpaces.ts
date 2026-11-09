import { useEffect, useState } from "react";
import { getItem, putItem } from "../lib/db";
import type { BudgetSpace, GoalSpace, SpacesState } from "../types/spaces";
import { movementCategories } from "../types/finance";
import { awardMascotMission } from "../lib/db";
import { currentMonthKey } from "../lib/mascot";
import { MASCOT_REWARDS } from "../types/mascot";

const EMPTY: SpacesState = { budgets: [], goals: [], budgetCategories: [], goalCategories: [], movementCategories: [] };

function id() { return `space_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

export function useSpaces() {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = await getItem("spaces", "main");
        if (active) setState(saved?.state ?? EMPTY);
        if (active) setStorageError(null);
      } catch (error) {
        if (active) setStorageError(error instanceof Error ? error.message : "No se pudieron leer los espacios locales.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const reload = () => void load();
    window.addEventListener("finance-data-restored", reload);
    return () => { active = false; window.removeEventListener("finance-data-restored", reload); };
  }, []);

  useEffect(() => {
    if (loading || storageError) return;
    putItem("spaces", { id: "main", state }).then(() => setStorageError(null)).catch((error: unknown) => {
      setStorageError(error instanceof Error ? error.message : "No se pudieron guardar los espacios en este dispositivo.");
    });
  }, [loading, state, storageError]);

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
    void awardMascotMission(`mission:budget-created:${currentMonthKey()}`, MASCOT_REWARDS.monthlyBudgetSetup, "Presupuesto mensual organizado").catch(() => undefined);
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

  function saveGoal(input: Omit<GoalSpace, "id" | "savedCents" | "archived">, existingId?: string) {
    setState((current) => ({
      ...current,
      goalCategories: input.categoryName && !current.goalCategories.some((name) => name.toLocaleLowerCase("es") === input.categoryName?.toLocaleLowerCase("es"))
        ? [...current.goalCategories, input.categoryName]
        : current.goalCategories,
      goals: existingId
        ? current.goals.map((item) => item.id === existingId ? { ...item, ...input } : item)
        : [{ ...input, id: id(), savedCents: 0, archived: false }, ...current.goals],
    }));
  }

  function contribute(goalId: string, amountCents: number) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) return;
    const goal = state.goals.find((item) => item.id === goalId);
    if (goal && goal.savedCents < goal.targetCents && goal.savedCents + amountCents >= goal.targetCents) {
      void awardMascotMission(`mission:goal-reached:${currentMonthKey()}`, MASCOT_REWARDS.monthlyGoalReached, "Objetivo de ahorro alcanzado").catch(() => undefined);
    }
    setState((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, savedCents: goal.savedCents + amountCents, contributions: [...(goal.contributions ?? []), { amountCents, date: new Date().toISOString() }] } : goal) }));
  }

  function archive(kind: "budget" | "goal", spaceId: string) {
    const key = kind === "budget" ? "budgets" : "goals";
    setState((current) => ({ ...current, [key]: current[key].map((space) => space.id === spaceId ? { ...space, archived: true } : space) }));
  }

  function remove(kind: "budget" | "goal", spaceId: string) {
    const key = kind === "budget" ? "budgets" : "goals";
    setState((current) => ({ ...current, [key]: current[key].filter((space) => space.id !== spaceId) }));
  }

  return { ...state, loading, storageError, saveBudget, saveGoal, contribute, archive, remove, addMovementCategory };
}
