import type { MovementCategory } from "./finance";

export type BudgetSpace = {
  id: string;
  name: string;
  category: MovementCategory;
  limit: number;
  color: string;
  icon: string;
  archived: boolean;
};

export type GoalSpace = {
  id: string;
  name: string;
  target: number;
  saved: number;
  contributions?: Array<{ amount: number; date: string }>;
  color: string;
  icon: string;
  archived: boolean;
};

export type SpacesState = { budgets: BudgetSpace[]; goals: GoalSpace[] };
