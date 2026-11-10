import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { MASCOT_LEVELS, MASCOT_REWARDS, type MascotEvent, type MascotProfile } from "../types/mascot";
import type { MascotProgress } from "../lib/mascot";
import type { MascotAdvice } from "../lib/mascotAdvice";
import { currency } from "../lib/money";
import type { FinancialAlert } from "../types/notifications";

type Props = {
  profile: MascotProfile;
  progress: MascotProgress;
  rewards: MascotEvent[];
  completed: Set<string>;
  week: string;
  month: string;
  weeklyIncomeCents: number;
  weeklyExpenseCents: number;
  weeklyActivityDays: number;
  fixedConcepts: string[];
  weeklyReviewAvailable: boolean;
  fixedReviewAvailable: boolean;
  monthlyReviewAvailable: boolean;
  monthlyReviewId: string;
  previousMonth: string;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  advice: MascotAdvice[];
  adviceMonth: string;
  alerts: FinancialAlert[];
  unreadCount: number;
  onMarkAlertsRead: (ids: string[]) => void;
  onFinish: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onReviewWeekly: () => Promise<void>;
  onReviewFixed: () => Promise<void>;
  onReviewMonthly: () => Promise<void>;
  onMinimize: () => void;
  onHide: () => void;
  onClose: () => void;
  celebration?: string;
};

export function MascotPanel(props: Props) {
  const { profile, progress } = props;
  const [name, setName] = useState(profile.name);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState(() => ({ height: window.visualViewport?.height ?? window.innerHeight, top: window.visualViewport?.offsetTop ?? 0 }));
  const level = MASCOT_LEVELS.find((item) => item.stage === progress.stage)!;
  const next = MASCOT_LEVELS.find((item) => item.minXp === progress.nextMilestone);

  useEffect(() => setName(profile.name), [profile.name]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape" && profile.onboardingComplete) props.onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile.onboardingComplete, props.onClose]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => setViewport({
      height: visualViewport?.height ?? window.innerHeight,
      top: visualViewport?.offsetTop ?? 0,
    });
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const weekLabel = useMemo(() => {
    const date = new Date(`${props.week}T12:00:00`);
    return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(date);
  }, [props.week]);
  const previousMonthLabel = useMemo(() => {
    const date = new Date(`${props.previousMonth}-01T12:00:00`);
    return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
  }, [props.previousMonth]);

  async function submitName(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (profile.onboardingComplete) await props.onRename(name);
      else await props.onFinish(name);
      setEditingName(false);
    } finally { setSaving(false); }
  }

  return createPortal(
    <div className="fixed inset-x-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/75 px-3 py-3 backdrop-blur-sm sm:px-6" style={{ top: viewport.top, height: viewport.height }} onMouseDown={(event) => { if (event.target === event.currentTarget && profile.onboardingComplete) props.onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="mascot-title" className="my-auto w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-[#34454e] bg-[#17232b] p-4 text-slate-100 shadow-2xl sm:p-6" style={{ maxHeight: `min(${Math.max(160, viewport.height - 24)}px, 760px)` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={level.image} alt="" className="h-20 w-20 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-[#b7f34a]">Compañera financiera</p>
              <h2 id="mascot-title" className="mt-1 truncate text-2xl font-black">{profile.name}</h2>
              <p className="text-sm text-slate-300">Etapa {level.label}</p>
            </div>
          </div>
          {profile.onboardingComplete ? <div className="flex shrink-0 gap-1.5"><button type="button" onClick={props.onMinimize} className="grid h-10 w-10 place-items-center rounded-xl border border-[#3b4a52] text-lg" aria-label="Minimizar Plantita" title="Minimizar">−</button><button type="button" onClick={props.onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-[#3b4a52] text-lg" aria-label="Cerrar panel">×</button></div> : null}
        </div>

        {!profile.onboardingComplete ? (
          <div className="mt-5 rounded-xl border border-[#39464c] bg-[#202d35] p-4">
            <p className="font-bold">¡Hola! Soy tu nueva compañera financiera. ¿Cómo quieres llamarme?</p>
            <form onSubmit={(event) => void submitName(event)} className="mt-4 flex gap-2">
              <input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#46565f] bg-[#111b21] px-3 py-3 text-base text-white outline-none focus:border-[#b7f34a]" aria-label="Nombre de la mascota" />
              <button disabled={saving || !name.trim()} className="btn-primary px-4" type="submit">Empezar</button>
            </form>
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-[#34454e] bg-[#1d2a32] p-4">
          <div className="flex items-end justify-between gap-3"><p className="text-3xl font-black text-[#b7f34a]">{progress.xp} <span className="text-base">XP</span></p><p className="text-right text-xs text-slate-400">{next ? `${progress.remainingXp} XP para ${next.label}` : "Etapa máxima alcanzada"}</p></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#34434a]" role="progressbar" aria-label="Progreso para la siguiente etapa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.progressPercent}><div className="h-full rounded-full bg-[#b7f34a] transition-[width] duration-700" style={{ width: `${progress.progressPercent}%` }} /></div>
          <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-500">{MASCOT_LEVELS.map((item) => <span key={item.stage} className={item.stage === progress.stage ? "text-[#b7f34a]" : ""}>{item.label} · {item.minXp}</span>)}</div>
        </div>

        {profile.onboardingComplete ? <>
          <div className="mt-5 flex items-center justify-between gap-3"><h3 className="font-black">Avisos de Plantita</h3>{props.unreadCount ? <span className="rounded-full bg-[#b7f34a] px-2.5 py-1 text-xs font-black text-[#17210d]">{props.unreadCount} nuevos</span> : <span className="text-[10px] text-slate-500">Al día</span>}</div>
          {props.alerts.length ? <>
            <ul className="mt-2 space-y-2">{props.alerts.slice(0, 5).map((alert) => <li key={alert.id} className={`rounded-xl border p-3 ${alert.level === "critical" ? "border-rose-400/20 bg-rose-950/30" : alert.level === "warning" ? "border-amber-300/20 bg-amber-950/20" : "border-[#b7f34a]/15 bg-[#26331d]"}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-100">{alert.title}{!alert.readAt ? <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#b7f34a] align-middle" aria-label="Nuevo" /> : null}</p><p className="mt-1 text-xs leading-5 text-slate-300">{alert.message}</p></div>{!alert.readAt ? <button type="button" onClick={() => props.onMarkAlertsRead([alert.id])} className="shrink-0 text-xs font-bold text-[#b7f34a]" aria-label={`Marcar como leído: ${alert.title}`}>Visto</button> : null}</div>
            </li>)}</ul>
            {props.unreadCount ? <button type="button" onClick={() => props.onMarkAlertsRead(props.alerts.filter((item) => !item.readAt).map((item) => item.id))} className="mt-2 w-full rounded-lg py-2 text-xs font-bold text-slate-400 hover:bg-white/5">Marcar todos como vistos</button> : null}
          </> : <p className="mt-2 rounded-xl bg-[#202d35] p-3 text-sm text-slate-400">Cuando detecte un presupuesto cerca del límite, una meta cumplida o un pago próximo, te avisaré aquí.</p>}
          <div className="mt-5 flex items-center justify-between gap-3"><h3 className="font-black">Consejos para {props.adviceMonth}</h3><span className="text-[10px] text-slate-500">Basados en tus registros</span></div>
          {props.advice.length ? <ul className="mt-2 space-y-2">{props.advice.map((item) => <li key={item.id} className="rounded-xl border border-[#34454e] bg-[#1d2a32] p-3 text-sm leading-5 text-slate-200"><span className="mr-2 text-[#b7f34a]" aria-hidden="true">{item.kind === "payment" ? "◷" : item.kind === "budget" ? "▤" : "☆"}</span>{item.message}</li>)}</ul> : <p className="mt-2 rounded-xl bg-[#202d35] p-3 text-sm text-slate-400">Cuando haya un presupuesto, objetivo o pago próximo, te mostraré aquí información útil.</p>}
          <div className="mt-5 flex items-center justify-between"><h3 className="font-black">Misiones</h3><span className="text-xs text-slate-400">Semana del {weekLabel}</span></div>
          <ul className="mt-2 space-y-2">
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[#202d35] p-3"><span><span className="block text-sm font-bold">Registra movimientos 5 días</span><span className="text-xs text-slate-400">{props.weeklyActivityDays}/5 días esta semana</span></span><span className="shrink-0 text-sm font-black text-[#b7f34a]">{props.completed.has(`mission:five-days:${props.week}`) ? "Completada" : `+${MASCOT_REWARDS.fiveActiveDays} XP`}</span></li>
            <li className="flex flex-col gap-2 rounded-xl bg-[#202d35] p-3 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0"><span className="block text-sm font-bold">Revisa tu resumen semanal</span><span className="block break-words text-xs text-slate-400">{currency(props.weeklyIncomeCents / 100)} ingresados · {currency(props.weeklyExpenseCents / 100)} gastados</span></span>{props.completed.has(`mission:weekly-review:${props.week}`) ? <span className="self-end text-sm font-bold text-emerald-300 sm:self-auto">Completada</span> : <button disabled={!props.weeklyReviewAvailable} type="button" onClick={() => void props.onReviewWeekly()} className="btn-primary self-end px-3 py-2 text-xs sm:self-auto">Revisé · +{MASCOT_REWARDS.weeklySummaryReview} XP</button>}</li>
            <li className="rounded-xl bg-[#202d35] p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0"><span className="block text-sm font-bold">Revisa tus gastos fijos</span><span className="block break-words text-xs text-slate-400">{props.fixedConcepts.length ? props.fixedConcepts.slice(0, 3).join(" · ") : "Aún no tienes gastos fijos"}</span></span>{props.completed.has(`mission:fixed-review:${props.week}`) ? <span className="self-end text-sm font-bold text-emerald-300 sm:self-auto">Completada</span> : <button disabled={!props.fixedReviewAvailable} type="button" onClick={() => void props.onReviewFixed()} className="btn-primary self-end px-3 py-2 text-xs sm:self-auto">Revisé · +{MASCOT_REWARDS.weeklyFixedReview} XP</button>}</div></li>
            <li className="flex flex-col gap-2 rounded-xl bg-[#202d35] p-3 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0"><span className="block text-sm font-bold">Revisa {previousMonthLabel}</span><span className="block break-words text-xs text-slate-400">{currency(props.monthlyIncomeCents / 100)} ingresados · {currency(props.monthlyExpenseCents / 100)} gastados</span></span>{props.completed.has(props.monthlyReviewId) ? <span className="self-end text-sm font-bold text-emerald-300 sm:self-auto">Completada</span> : <button disabled={!props.monthlyReviewAvailable} type="button" onClick={() => void props.onReviewMonthly()} className="btn-primary self-end px-3 py-2 text-xs sm:self-auto">Revisé · +{MASCOT_REWARDS.monthlySummaryReview} XP</button>}</li>
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[#202d35] p-3"><span className="text-sm font-bold">Organiza un presupuesto este mes</span><span className="text-sm font-black text-[#b7f34a]">{props.completed.has(`mission:budget-created:${props.month}`) ? "Completada" : `+${MASCOT_REWARDS.monthlyBudgetSetup} XP`}</span></li>
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[#202d35] p-3"><span className="text-sm font-bold">Alcanza un objetivo de ahorro</span><span className="text-sm font-black text-[#b7f34a]">{props.completed.has(`mission:goal-reached:${props.month}`) ? "Logro registrado" : `+${MASCOT_REWARDS.monthlyGoalReached} XP`}</span></li>
          </ul>

          <div className="mt-5 flex items-center justify-between"><h3 className="font-black">Últimas recompensas</h3><button type="button" onClick={() => setEditingName((value) => !value)} className="text-xs font-bold text-[#b7f34a]">Cambiar nombre</button></div>
          {editingName ? <form onSubmit={(event) => void submitName(event)} className="mt-2 flex gap-2"><input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#46565f] bg-[#111b21] px-3 py-2 text-sm text-white" aria-label="Nuevo nombre" /><button type="submit" className="btn-primary px-3 py-2 text-xs">Guardar</button></form> : null}
          <ul className="mt-2 divide-y divide-[#34434a]">{props.rewards.length ? props.rewards.map((reward) => <li key={reward.id} className="flex justify-between gap-3 py-2 text-sm"><span className="text-slate-300">{reward.reason}</span><span className="shrink-0 font-black text-[#b7f34a]">+{reward.xp} XP</span></li>) : <li className="py-2 text-sm text-slate-400">Tus primeras recompensas aparecerán aquí.</li>}</ul>
          <p className="mt-3 text-center text-[11px] text-slate-500">El progreso se gana con hábitos, nunca por el importe de tus gastos o ingresos.</p>
          <details className="mt-3 rounded-xl bg-[#202d35] p-3 text-xs text-slate-400"><summary className="cursor-pointer font-bold text-slate-200">Cómo se gana XP</summary><ul className="mt-2 space-y-1.5"><li>+{MASCOT_REWARDS.movement} XP por movimiento registrado; máximo {MASCOT_REWARDS.dailyMovementCap} XP diarios.</li><li>+{MASCOT_REWARDS.threeDayStreak} XP por registrar movimientos en 3 días de la semana.</li><li>+{MASCOT_REWARDS.fiveActiveDays} XP al registrar movimientos 5 días de una semana.</li><li>+{MASCOT_REWARDS.weeklySummaryReview} XP al revisar un resumen semanal y +{MASCOT_REWARDS.monthlySummaryReview} XP por el mensual.</li><li>+{MASCOT_REWARDS.weeklyFixedReview} XP por revisar gastos fijos; +{MASCOT_REWARDS.monthlyBudgetSetup} XP al organizar un presupuesto mensual.</li><li>+{MASCOT_REWARDS.monthlyGoalReached} XP al alcanzar un objetivo, una vez al mes.</li></ul><p className="mt-2">Editar, importar o restaurar movimientos no genera XP retroactivo.</p></details>
          <button type="button" onClick={props.onHide} className="mt-4 w-full rounded-xl border border-[#3b4a52] px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5">Ocultar hasta cambiar de sección</button>
        </> : null}

        {props.celebration ? <div className="mt-4 rounded-xl border border-[#b7f34a]/40 bg-[#28351e] p-3 text-center font-bold text-[#d8ff9c]" role="status">¡Nueva etapa desbloqueada: {props.celebration}!</div> : null}
      </section>
    </div>,
    document.body,
  );
}
