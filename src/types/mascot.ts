export type MascotStage = "brote" | "crecimiento" | "equilibrio" | "prosperidad";

export type MascotProfile = {
  name: string;
  onboardingComplete: boolean;
  celebratedStage: MascotStage;
};

export type MascotEvent = {
  id: string;
  xp: number;
  reason: string;
  kind: "movement" | "mission" | "streak" | "legacy";
  sourceId: string;
  occurredAt: string;
  activityDate?: string;
};

export const DEFAULT_MASCOT_PROFILE: MascotProfile = {
  name: "Plantita",
  onboardingComplete: false,
  celebratedStage: "brote",
};

export const MASCOT_LEVELS = [
  { stage: "brote", label: "Brote", minXp: 0, image: "/mascot/sprout.png" },
  { stage: "crecimiento", label: "Crecimiento", minXp: 150, image: "/mascot/leaf.png" },
  { stage: "equilibrio", label: "Equilibrio", minXp: 450, image: "/mascot/guardian.png" },
  { stage: "prosperidad", label: "Prosperidad", minXp: 1000, image: "/mascot/guardian.png" },
] as const;
