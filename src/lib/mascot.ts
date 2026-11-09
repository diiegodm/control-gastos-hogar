import { MASCOT_LEVELS, type MascotEvent, type MascotStage } from "../types/mascot";

export type MascotProgress = {
  stage: MascotStage;
  xp: number;
  progressPercent: number;
  nextMilestone: number | null;
  remainingXp: number;
};

export function mascotStageForXp(xp: number): MascotStage {
  return [...MASCOT_LEVELS].reverse().find((level) => xp >= level.minXp)!.stage;
}

export function getMascotProgress(events: MascotEvent[]): MascotProgress {
  const xp = events.reduce((total, event) => total + Math.max(0, event.xp), 0);
  const levelIndex = MASCOT_LEVELS.findIndex((level) => level.stage === mascotStageForXp(xp));
  const current = MASCOT_LEVELS[levelIndex];
  const next = MASCOT_LEVELS[levelIndex + 1];
  if (!next) return { stage: current.stage, xp, progressPercent: 100, nextMilestone: null, remainingXp: 0 };
  const range = next.minXp - current.minXp;
  return {
    stage: current.stage,
    xp,
    progressPercent: Math.min(100, Math.round(((xp - current.minXp) / range) * 100)),
    nextMilestone: next.minXp,
    remainingXp: next.minXp - xp,
  };
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekKey(date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateKey(monday);
}

export function currentMonthKey(date = new Date()): string {
  return localDateKey(date).slice(0, 7);
}

export function previousMonthKey(date = new Date()): string {
  return currentMonthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

export function distinctActivityDays(events: MascotEvent[], week: string): string[] {
  return [...new Set(events.filter((event) => event.kind === "movement" && event.activityDate && weekKey(new Date(`${event.activityDate}T12:00:00`)) === week).map((event) => event.activityDate!))];
}

export function recentMascotRewards(events: MascotEvent[]): MascotEvent[] {
  return events.filter((event) => event.xp > 0).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5);
}
