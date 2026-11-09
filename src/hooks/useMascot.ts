import { useCallback, useEffect, useMemo, useState } from "react";
import { awardMascotMission, getMascotState, saveMascotProfile } from "../lib/db";
import { currentMonthKey, getMascotProgress, localDateKey, recentMascotRewards, weekKey } from "../lib/mascot";
import type { MascotProfile } from "../types/mascot";

export function useMascot(fixedExpenseCount: number, movementCount: number) {
  const [profile, setProfile] = useState<MascotProfile>({ name: "Plantita", onboardingComplete: false, celebratedStage: "brote" });
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getMascotState>>["events"]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const saved = await getMascotState();
    setProfile(saved.profile);
    setEvents(saved.events);
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = await getMascotState();
        if (active) { setProfile(saved.profile); setEvents(saved.events); }
      } finally { if (active) setLoading(false); }
    };
    void load();
    const reload = () => void load();
    window.addEventListener("mascot-state-updated", reload);
    window.addEventListener("finance-data-restored", reload);
    return () => { active = false; window.removeEventListener("mascot-state-updated", reload); window.removeEventListener("finance-data-restored", reload); };
  }, []);

  const progress = useMemo(() => getMascotProgress(events), [events]);
  const rewards = useMemo(() => recentMascotRewards(events), [events]);
  const week = weekKey();
  const month = currentMonthKey();
  const weeklySummaryId = `mission:weekly-review:${week}`;
  const fixedReviewId = `mission:fixed-review:${week}`;
  const completed = useMemo(() => new Set(events.map((event) => event.id)), [events]);

  const finishOnboarding = useCallback(async (name: string) => {
    const next = { ...profile, name: name.trim().replace(/\s+/g, " ").slice(0, 20) || "Plantita", onboardingComplete: true };
    await saveMascotProfile(next);
    setProfile(next);
  }, [profile]);
  const rename = useCallback(async (name: string) => {
    const next = { ...profile, name: name.trim().replace(/\s+/g, " ").slice(0, 20) || "Plantita" };
    await saveMascotProfile(next);
    setProfile(next);
  }, [profile]);
  const reviewWeeklySummary = useCallback(async () => {
    await awardMascotMission(weeklySummaryId, 15, "Resumen semanal revisado");
    await refresh();
  }, [refresh, weeklySummaryId]);
  const reviewFixedExpenses = useCallback(async () => {
    await awardMascotMission(fixedReviewId, 20, "Gastos fijos revisados");
    await refresh();
  }, [fixedReviewId, refresh]);

  return {
    profile, events, progress, rewards, loading, completed, week, month,
    weeklySummaryId, fixedReviewId, finishOnboarding, rename, reviewWeeklySummary, reviewFixedExpenses,
    weeklyReviewAvailable: movementCount > 0,
    fixedReviewAvailable: fixedExpenseCount > 0,
    currentDate: localDateKey(),
  };
}
