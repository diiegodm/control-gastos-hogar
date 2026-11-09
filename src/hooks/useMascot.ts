import { useCallback, useEffect, useMemo, useState } from "react";
import { awardMascotMission, getMascotState, saveMascotProfile } from "../lib/db";
import { currentMonthKey, getMascotProgress, localDateKey, previousMonthKey, recentMascotRewards, weekKey } from "../lib/mascot";
import { MASCOT_REWARDS, type MascotProfile, type MascotStage } from "../types/mascot";

export function useMascot(fixedExpenseCount: number, movementCount: number, monthlyReviewAvailable: boolean) {
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
  const previousMonth = previousMonthKey();
  const weeklySummaryId = `mission:weekly-review:${week}`;
  const fixedReviewId = `mission:fixed-review:${week}`;
  const monthlyReviewId = `mission:monthly-review:${previousMonth}`;
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
  const markCelebratedStage = useCallback(async (stage: MascotStage) => {
    const next = { ...profile, celebratedStage: stage };
    await saveMascotProfile(next);
    setProfile(next);
  }, [profile]);
  const reviewFixedExpenses = useCallback(async () => {
    await awardMascotMission(fixedReviewId, MASCOT_REWARDS.weeklyFixedReview, "Gastos fijos revisados");
    await refresh();
  }, [fixedReviewId, refresh]);
  const reviewMonthlySummary = useCallback(async () => {
    await awardMascotMission(monthlyReviewId, MASCOT_REWARDS.monthlySummaryReview, "Resumen mensual revisado");
    await refresh();
  }, [monthlyReviewId, refresh]);
  const reviewWeeklySummaryWithReward = useCallback(async () => {
    await awardMascotMission(weeklySummaryId, MASCOT_REWARDS.weeklySummaryReview, "Resumen semanal revisado");
    await refresh();
  }, [refresh, weeklySummaryId]);

  return {
    profile, events, progress, rewards, loading, completed, week, month,
    weeklySummaryId, fixedReviewId, monthlyReviewId, previousMonth, finishOnboarding, rename, markCelebratedStage,
    reviewWeeklySummary: reviewWeeklySummaryWithReward, reviewFixedExpenses, reviewMonthlySummary,
    weeklyReviewAvailable: movementCount > 0,
    fixedReviewAvailable: fixedExpenseCount > 0,
    monthlyReviewAvailable,
    currentDate: localDateKey(),
  };
}
