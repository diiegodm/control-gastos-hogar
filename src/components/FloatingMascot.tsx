import type { MascotProgress } from "../lib/mascot";
import { MASCOT_LEVELS } from "../types/mascot";

type Props = {
  name: string;
  progress: MascotProgress;
  minimized: boolean;
  onOpen: () => void;
  onToggleMinimized: () => void;
};

export function FloatingMascot({ name, progress, minimized, onOpen, onToggleMinimized }: Props) {
  const level = MASCOT_LEVELS.find((item) => item.stage === progress.stage)!;
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-30 flex items-center gap-1.5 sm:right-5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir a ${name}. Etapa ${level.label}, ${progress.xp} puntos.`}
        className={`flex min-h-12 items-center justify-center gap-2 border border-[#42515a] bg-[#202d36] text-slate-100 shadow-[0_8px_28px_rgb(0_0_0_/_35%)] transition hover:border-[#b7f34a] active:scale-[0.97] ${minimized ? "h-14 w-14 rounded-full p-1" : "max-w-48 rounded-full py-1.5 pl-1.5 pr-4"}`}
      >
        <img src={level.image} alt="" className={`shrink-0 object-contain ${minimized ? "h-11 w-11" : "h-10 w-10"}`} />
        {!minimized ? <span className="min-w-0 text-left"><span className="block max-w-28 truncate text-sm font-black">{name}</span><span className="block text-[10px] font-semibold text-slate-400">{level.label} · {progress.xp} XP</span></span> : null}
      </button>
      <button
        type="button"
        onClick={onToggleMinimized}
        className="grid h-8 w-8 place-items-center rounded-full border border-[#42515a] bg-[#202d36] text-xs font-black text-slate-200 shadow-lg"
        aria-label={minimized ? "Expandir burbuja de Plantita" : "Minimizar burbuja de Plantita"}
        title={minimized ? "Expandir" : "Minimizar"}
      >
        {minimized ? "+" : "−"}
      </button>
    </div>
  );
}
