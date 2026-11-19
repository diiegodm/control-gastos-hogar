import { Card } from "./Card";
import type { MascotProgress } from "../lib/mascot";
import { MASCOT_LEVELS } from "../types/mascot";
import type { FinancialAlert } from "../types/notifications";

type Props = {
  name: string;
  progress: MascotProgress;
  unreadCount: number;
  alert?: FinancialAlert;
  advice?: string;
  minimized: boolean;
  onOpen: () => void;
  onToggleMinimized: () => void;
};

export function MascotHomeCard({ name, progress, unreadCount, alert, advice, minimized, onOpen, onToggleMinimized }: Props) {
  const level = MASCOT_LEVELS.find((item) => item.stage === progress.stage)!;
  const message = alert?.message ?? advice ?? "Registra tus movimientos y te ayudaré a mantener tus finanzas en orden.";

  if (minimized) {
    return (
      <button type="button" onClick={onToggleMinimized} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#34434c] bg-[#202d36]/90 px-4 py-2 text-left shadow-soft transition hover:border-[#b7f34a]">
        <img src={level.image} alt="" className="h-11 w-11 shrink-0 object-contain" />
        <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-100">{name}</span><span className="block text-xs text-slate-400">Resumen contraído · {progress.xp} XP</span></span>
        {unreadCount > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#b7f34a] px-1 text-xs font-black text-[#17210d]">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
        <span className="text-lg font-bold text-[#b7f34a]" aria-hidden="true">⌄</span>
      </button>
    );
  }

  return (
    <Card className="border-[#3d5940] bg-[#19271f]/95">
      <div className="flex items-start gap-3">
        <img src={level.image} alt="" className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-xs font-bold text-slate-300">Un pequeño paso hoy</p><h2 className="mt-1 truncate text-lg font-black text-slate-50">{alert?.title ?? (advice ? "Plantita tiene un consejo" : "Vas al día")}</h2></div>
            <button type="button" onClick={onToggleMinimized} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#3b4a52] text-lg font-bold text-slate-300 hover:border-[#b7f34a]" aria-label="Contraer tarjeta de Plantita" title="Contraer">−</button>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-300">{message}</p>
          <button type="button" onClick={onOpen} className="mt-3 rounded-full border border-[#b7f34a] px-4 py-1.5 text-sm font-bold text-[#b7f34a] transition hover:bg-[#b7f34a]/10">Ver Plantita <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div className="mt-3 border-t border-[#34434c] pt-3">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-sm font-bold text-slate-200">{name} · {level.label}</span>
          <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-[#34434a]" role="progressbar" aria-label={`Progreso de ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.progressPercent}><div className="h-full rounded-full bg-[#b7f34a] transition-[width] duration-700" style={{ width: `${progress.progressPercent}%` }} /></div>
          <span className="shrink-0 text-xs font-semibold text-slate-400">{progress.xp}{progress.nextMilestone ? ` / ${progress.nextMilestone}` : " XP"} XP</span>
        </div>
        {unreadCount > 0 ? <p className="mt-2 text-xs font-semibold text-[#c8f58a]">{unreadCount} {unreadCount === 1 ? "aviso nuevo" : "avisos nuevos"}</p> : null}
      </div>
    </Card>
  );
}
