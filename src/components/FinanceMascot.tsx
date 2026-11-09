import type { MascotProgress } from "../lib/mascot";
import { MASCOT_LEVELS } from "../types/mascot";

export function FinanceMascot({ name, progress, onClick }: { name: string; progress: MascotProgress; onClick: () => void }) {
  const stage = MASCOT_LEVELS.find((level) => level.stage === progress.stage)!;
  return (
    <button type="button" onClick={onClick} className="flex w-36 shrink-0 items-center justify-end gap-1.5 rounded-xl p-1 text-right transition hover:bg-white/5 active:scale-[0.98] sm:w-44 sm:gap-2" aria-label={`Abrir progreso de ${name}, etapa ${stage.label}, ${progress.xp} XP`}>
      <img className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" src={stage.image} alt="" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase text-slate-400 sm:text-xs">Tu compañera</span>
        <span className="block truncate text-sm font-black text-slate-50 sm:text-base">{name}</span>
        <span className="block whitespace-nowrap text-[10px] font-semibold text-slate-400">{stage.label} · {progress.xp} XP</span>
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#354047]" role="progressbar" aria-label="Progreso de evolución" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.progressPercent}>
          <span className="block h-full rounded-full bg-[#b7f34a] transition-[width] duration-500" style={{ width: `${progress.progressPercent}%` }} />
        </span>
      </span>
    </button>
  );
}
