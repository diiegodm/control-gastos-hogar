import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MASCOT_LEVELS, type MascotEvent, type MascotProfile } from "../types/mascot";
import type { MascotProgress } from "../lib/mascot";
import { currency } from "../lib/money";

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
  onFinish: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onReviewWeekly: () => Promise<void>;
  onReviewFixed: () => Promise<void>;
  onClose: () => void;
  celebration?: string;
};

export function MascotPanel(props: Props) {
  const { profile, progress } = props;
  const [name, setName] = useState(profile.name);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const level = MASCOT_LEVELS.find((item) => item.stage === progress.stage)!;
  const next = MASCOT_LEVELS.find((item) => item.minXp === progress.nextMilestone);

  useEffect(() => setName(profile.name), [profile.name]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape" && profile.onboardingComplete) props.onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile.onboardingComplete, props]);

  const weekLabel = useMemo(() => {
    const date = new Date(`${props.week}T12:00:00`);
    return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(date);
  }, [props.week]);

  async function submitName(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (profile.onboardingComplete) await props.onRename(name);
      else await props.onFinish(name);
      setEditingName(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && profile.onboardingComplete) props.onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="mascot-title" className="max-h-[min(88svh,760px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-[#34454e] bg-[#17232b] p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={level.image} alt="" className="h-20 w-20 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-[#b7f34a]">Compañera financiera</p>
              <h2 id="mascot-title" className="mt-1 truncate text-2xl font-black">{profile.name}</h2>
              <p className="text-sm text-slate-300">Etapa {level.label}</p>
            </div>
          </div>
          {profile.onboardingComplete ? <button type="button" onClick={props.onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#3b4a52] text-lg" aria-label="Cerrar">×</button> : null}
        </div>

        {!profile.onboardingComplete ? (
          <div className="mt-5 rounded-xl border border-[#39464c] bg-[#202d35] p-4">
            <p className="font-bold">¡Hola! Soy tu nueva compañera financiera. ¿Cómo quieres llamarme?</p>
            <form onSubmit={(event) => void submitName(event)} className="mt-4 flex gap-2">
              <input autoFocus maxLength={20} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#46565f] bg-[#111b21] px-3 py-3 text-base text-white outline-none focus:border-[#b7f34a]" aria-label="Nombre de la mascota" />
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
          <div className="mt-5 flex items-center justify-between"><h3 className="font-black">Misiones</h3><span className="text-xs text-slate-400">Semana del {weekLabel}</span></div>
          <ul className="mt-2 space-y-2">
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[#202d35] p-3"><span><span className="block text-sm font-bold">Registra movimientos 5 días</span><span className="text-xs text-slate-400">{props.weeklyActivityDays}/5 días esta semana</span></span><span className="shrink-0 text-sm font-black text-[#b7f34a]">{props.completed.has(`mission:five-days:${props.week}`) ? "Completada" : "+20 XP"}</span></li>
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[#202d35] p-3"><span><span className="block text-sm font-bold">Revisa tu resumen semanal</span><span className="text-xs text-slate-400">{currency(props.weeklyIncomeCents / 100)} ingresados · {currency(props.weeklyExpenseCents / 100)} gastados</span></span>{props.completed.has(`mission:weekly-review:${props.week}`) ? <span className="text-sm font-bold text-emerald-300">Completada</span> : <button disabled={!props.weeklyReviewAvailable} type="button" onClick={() => void props.onReviewWeekly()} className="btn-primary shrink-0 px-3 py-2 text-xs">Revisé · +15 XP</button>}</li>
            <li className="rounded-xl bg-[#202d35] p-3"><div className="flex items-center justify-between gap-3"><span><span className="block text-sm font-bold">Revisa tus gastos fijos</span><span className="text-xs text-slate-400">{props.fixedConcepts.length ? props.fixedConcepts.slice(0, 3).join(" · ") : "Aún no tienes gastos fijos"}</span></span>{props.completed.has(`mission:fixed-review:${props.week}`) ? <span className="text-sm font-bold text-emerald-300">Completada</span> : <button disabled={!props.fixedReviewAvailable} type="button" onClick={() => void props.onReviewFixed()} className="btn-primary shrink-0 px-3 py-2 text-xs">Revisé · +20 XP</button>}</div></li>
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[#202d35] p-3"><span className="text-sm font-bold">Organiza un presupuesto este mes</span><span className="text-sm font-black text-[#b7f34a]">{props.completed.has(`mission:budget-created:${props.month}`) ? "Completada" : "+25 XP"}</span></li>
            <li className="flex items-center justify-between gap-3 rounded-xl bg-[#202d35] p-3"><span className="text-sm font-bold">Alcanza un objetivo de ahorro</span><span className="text-sm font-black text-[#b7f34a]">{props.completed.has(`mission:goal-reached:${props.month}`) ? "Logro registrado" : "+60 XP"}</span></li>
          </ul>

          <div className="mt-5 flex items-center justify-between"><h3 className="font-black">Últimas recompensas</h3><button type="button" onClick={() => setEditingName((value) => !value)} className="text-xs font-bold text-[#b7f34a]">Cambiar nombre</button></div>
          {editingName ? <form onSubmit={(event) => void submitName(event)} className="mt-2 flex gap-2"><input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#46565f] bg-[#111b21] px-3 py-2 text-sm text-white" aria-label="Nuevo nombre" /><button type="submit" className="btn-primary px-3 py-2 text-xs">Guardar</button></form> : null}
          <ul className="mt-2 divide-y divide-[#34434a]">{props.rewards.length ? props.rewards.map((reward) => <li key={reward.id} className="flex justify-between gap-3 py-2 text-sm"><span className="text-slate-300">{reward.reason}</span><span className="shrink-0 font-black text-[#b7f34a]">+{reward.xp} XP</span></li>) : <li className="py-2 text-sm text-slate-400">Tus primeras recompensas aparecerán aquí.</li>}</ul>
          <p className="mt-3 text-center text-[11px] text-slate-500">El progreso se gana con hábitos, nunca por el importe de tus gastos o ingresos.</p>
        </> : null}

        {props.celebration ? <div className="mt-4 rounded-xl border border-[#b7f34a]/40 bg-[#28351e] p-3 text-center font-bold text-[#d8ff9c]" role="status">¡Nueva etapa desbloqueada: {props.celebration}!</div> : null}
      </section>
    </div>
  );
}
