import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav, type Section } from "./components/BottomNav";
import { Dashboard } from "./views/Dashboard";
import { Spaces } from "./views/Spaces";
import { Analysis } from "./views/Analysis";
import { Profile } from "./views/Profile";
import { QuickMovement } from "./components/QuickMovement";
import { useFinance } from "./hooks/useFinance";
import { useNotes } from "./hooks/useNotes";
import { useSpaces } from "./hooks/useSpaces";
import { useLocalAuth } from "./hooks/useLocalAuth";
import { LocalAccess } from "./components/LocalAccess";
import { currentYearMonth, monthOption, todayISO } from "./lib/date";
import { parseBackup } from "./lib/db";
import { FloatingMascot } from "./components/FloatingMascot";
import { MascotPanel } from "./components/MascotPanel";
import { useMascot } from "./hooks/useMascot";
import { MASCOT_LEVELS } from "./types/mascot";
import { buildMascotAdvice } from "./lib/mascotAdvice";
import { distinctActivityDays } from "./lib/mascot";
import { previousMonthKey } from "./lib/mascot";
import { monthSummary } from "./lib/summary";
import { buildFinancialAlerts } from "./lib/financialAlerts";
import { useNotifications } from "./hooks/useNotifications";

const initialMonth = currentYearMonth();

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [selectedYm, setSelectedYm] = useState(initialMonth);
  const [showQuickMovement, setShowQuickMovement] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const finance = useFinance(selectedYm);
  const notes = useNotes();
  const spaces = useSpaces();
  const lastMonth = previousMonthKey();
  const hasLastMonthData = finance.movements.some((movement) => movement.date.startsWith(lastMonth))
    || finance.fixedPayments.some((payment) => payment.month === lastMonth);
  const mascot = useMascot(finance.fixedExpenses.length, finance.movements.length, hasLastMonthData);
  const lastMonthSummary = useMemo(() => monthSummary(finance, mascot.previousMonth), [finance, mascot.previousMonth]);
  const alertCandidates = useMemo(() => buildFinancialAlerts({
    month: currentYearMonth(),
    today: todayISO(),
    budgets: spaces.budgets,
    goals: spaces.goals,
    categorySpending: finance.summary.categoryData,
    currentMonthSpentCents: Math.round(finance.summary.totalSpent * 100),
    previousMonthSpentCents: Math.round(lastMonthSummary.totalSpent * 100),
    upcomingPayments: finance.dashboard.upcomingPayments,
  }), [finance.dashboard.upcomingPayments, finance.summary.categoryData, finance.summary.totalSpent, lastMonthSummary.totalSpent, spaces.budgets, spaces.goals]);
  const notifications = useNotifications(alertCandidates, !finance.loading && !spaces.loading && selectedYm === currentYearMonth());
  const auth = useLocalAuth();
  const importRef = useRef<HTMLInputElement | null>(null);
  const [mascotOpen, setMascotOpen] = useState(false);
  const [mascotMinimized, setMascotMinimized] = useState(false);
  const [mascotHidden, setMascotHidden] = useState(false);
  const [celebration, setCelebration] = useState<string>();

  useEffect(() => {
    window.dispatchEvent(new Event("finance-app-mounted"));
  }, []);

  useEffect(() => {
    if (!mascot.loading && !mascot.profile.onboardingComplete) setMascotOpen(true);
  }, [mascot.loading, mascot.profile.onboardingComplete]);

  useEffect(() => {
    if (mascot.loading || !mascot.profile.onboardingComplete) return;
    const stageIndex = MASCOT_LEVELS.findIndex((item) => item.stage === mascot.progress.stage);
    const celebratedIndex = MASCOT_LEVELS.findIndex((item) => item.stage === mascot.profile.celebratedStage);
    if (stageIndex > celebratedIndex) {
      const level = MASCOT_LEVELS[stageIndex];
      setCelebration(level.label);
      setMascotOpen(true);
      void mascot.markCelebratedStage(level.stage);
    }
  }, [mascot.loading, mascot.profile, mascot.progress.stage, mascot.markCelebratedStage]);

  const advice = useMemo(() => buildMascotAdvice({
    budgets: spaces.budgets,
    goals: spaces.goals,
    categorySpending: finance.summary.categoryData,
    upcomingPayments: finance.dashboard.upcomingPayments,
  }), [finance.dashboard.upcomingPayments, finance.summary.categoryData, spaces.budgets, spaces.goals]);
  const weeklyActivityDays = distinctActivityDays(mascot.events, mascot.week).length;
  const weekStart = new Date(`${mascot.week}T00:00:00`);
  const weekMovements = finance.movements.filter((movement) => {
    const recorded = new Date(movement.createdAt);
    return recorded >= weekStart && recorded < new Date(weekStart.getTime() + 7 * 86400000);
  });
  const weeklyIncomeCents = weekMovements.filter((item) => item.type === "Ingreso").reduce((sum, item) => sum + item.amountCents, 0);
  const weeklyExpenseCents = weekMovements.filter((item) => item.type === "Gasto").reduce((sum, item) => sum + item.amountCents, 0);

  function changeSection(next: Section) {
    setSection(next);
    setMascotHidden(false);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImportFeedback(null);
    try {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text) as unknown;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "formato JSON no reconocido";
        throw new Error(`El archivo no contiene un JSON válido: ${detail}`);
      }
      const payload = parseBackup(raw);
      if (!confirm("Antes de reemplazar los datos se descargará una copia del estado actual. ¿Continuar con la importación?")) return;
      await finance.backup();
      await finance.restore(payload);
      setImportFeedback({ type: "success", message: "Respaldo importado correctamente. Se descargó una copia de los datos anteriores." });
    } catch (error) {
      setImportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo completar la importación.",
      });
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function exportCurrentBackup() {
    setImportFeedback(null);
    try {
      await finance.backup();
      setImportFeedback({ type: "success", message: "Respaldo descargado correctamente." });
    } catch (error) {
      setImportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo exportar el respaldo.",
      });
    }
  }

  if (!auth.ready || auth.needsSetup || !auth.unlocked) {
    return <LocalAccess auth={auth} />;
  }

  if (finance.loading || spaces.loading || notes.loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-app px-6 text-center">
        <div>
          <div className="mx-auto h-12 w-12 animate-pulse rounded-3xl bg-slate-950" />
          <p className="mt-4 font-bold text-slate-700">Preparando tus finanzas...</p>
        </div>
      </main>
    );
  }

  if (finance.loadError) {
    return <main className="flex min-h-dvh items-center justify-center bg-app px-5 text-slate-100"><section className="w-full max-w-md rounded-2xl border border-[#3b4a52] bg-[#202d36] p-5"><h1 className="text-xl font-black">No se pudieron cargar tus datos</h1><p role="alert" className="mt-2 text-sm text-slate-300">{finance.loadError}</p><button className="btn-primary mt-4 w-full" type="button" onClick={finance.retry}>Reintentar</button></section></main>;
  }

  return (
    <div className="min-h-dvh bg-app text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-app/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => changeSection("dashboard")}
            className="text-left"
            aria-label="Ir al Dashboard"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#b7f34a]">FINANZAS HOGAR</p>
            <p className="text-xl font-black tracking-normal text-slate-950">Finanzas</p>
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
              {monthOption(selectedYm).shortLabel} {monthOption(selectedYm).year}
            </span>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5">
        {[spaces.storageError, notes.storageError].filter((message): message is string => Boolean(message)).map((message) => <p key={message} role="alert" className="mb-4 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">{message}</p>)}
        <div key={section} className="page-transition">
          {section === "dashboard" ? (
            <Dashboard name={auth.name} selectedYm={selectedYm} onMonthChange={setSelectedYm} finance={finance} spaces={spaces} onOpenSpaces={() => changeSection("spaces")} />
          ) : null}
          {section === "spaces" ? <Spaces finance={finance} notes={notes} spaces={spaces} selectedYm={selectedYm} onMonthChange={setSelectedYm} /> : null}
          {section === "analysis" ? <Analysis finance={finance} selectedYm={selectedYm} onMonthChange={setSelectedYm} /> : null}
          {section === "profile" ? <Profile name={auth.name} onLock={auth.lock} onExport={() => void exportCurrentBackup()} onImport={() => importRef.current?.click()} importFeedback={importFeedback} financialSettings={finance.financialSettings} onSaveFinancialSettings={finance.updateFinancialSettings} notificationPreferences={notifications.preferences} notificationPermission={notifications.permission} notificationError={notifications.error} onUpdateNotificationPreferences={notifications.updatePreferences} onEnableDeviceNotifications={notifications.requestDeviceNotifications} onDisableDeviceNotifications={notifications.disableDeviceNotifications} /> : null}
        </div>
      </main>

      <BottomNav active={section} onChange={changeSection} onAdd={() => setShowQuickMovement(true)} />
      {showQuickMovement ? <QuickMovement finance={finance} customCategories={[...spaces.budgetCategories, ...spaces.movementCategories]} budgetSpaces={spaces.budgets} onCreateCategory={spaces.addMovementCategory} onClose={() => setShowQuickMovement(false)} /> : null}
      {mascot.profile.onboardingComplete && !mascotHidden ? <FloatingMascot
        name={mascot.profile.name}
        progress={mascot.progress}
        minimized={mascotMinimized}
        unreadCount={notifications.unreadCount}
        latestAlertTitle={notifications.alerts.find((item) => !item.readAt)?.title}
        onOpen={() => { setCelebration(undefined); setMascotOpen(true); }}
        onToggleMinimized={() => setMascotMinimized((value) => !value)}
      /> : null}
      {mascotOpen ? <MascotPanel
        profile={mascot.profile}
        progress={mascot.progress}
        rewards={mascot.rewards}
        completed={mascot.completed}
        week={mascot.week}
        month={mascot.month}
        weeklyIncomeCents={weeklyIncomeCents}
        weeklyExpenseCents={weeklyExpenseCents}
        weeklyActivityDays={weeklyActivityDays}
        fixedConcepts={finance.fixedExpenses.map((expense) => expense.concept)}
        weeklyReviewAvailable={mascot.weeklyReviewAvailable}
        fixedReviewAvailable={mascot.fixedReviewAvailable}
        monthlyReviewAvailable={mascot.monthlyReviewAvailable}
        monthlyReviewId={mascot.monthlyReviewId}
        previousMonth={mascot.previousMonth}
        monthlyIncomeCents={Math.round(lastMonthSummary.income * 100)}
        monthlyExpenseCents={Math.round((lastMonthSummary.fixedExpenses + lastMonthSummary.variableExpenses) * 100)}
        advice={advice}
        adviceMonth={`${monthOption(selectedYm).label} ${monthOption(selectedYm).year}`}
        alerts={notifications.alerts}
        unreadCount={notifications.unreadCount}
        onMarkAlertsRead={(ids) => void notifications.markRead(ids)}
        onFinish={mascot.finishOnboarding}
        onRename={mascot.rename}
        onReviewWeekly={mascot.reviewWeeklySummary}
        onReviewFixed={mascot.reviewFixedExpenses}
        onReviewMonthly={mascot.reviewMonthlySummary}
        onMinimize={() => { setMascotMinimized(true); setMascotOpen(false); }}
        onHide={() => { setMascotOpen(false); setMascotHidden(true); }}
        onClose={() => setMascotOpen(false)}
        celebration={celebration}
      /> : null}
    </div>
  );
}
