import type { MascotProgress } from "../lib/mascot";
import { MASCOT_LEVELS } from "../types/mascot";

type Props = {
  name: string;
  progress: MascotProgress;
  minimized: boolean;
  unreadCount: number;
  latestAlertTitle?: string;
  onOpen: () => void;
  onToggleMinimized: () => void;
};

export function FloatingMascot({ name, progress, minimized, unreadCount, latestAlertTitle, onOpen, onToggleMinimized }: Props) {
  const level = MASCOT_LEVELS.find((item) => item.stage === progress.stage)!;
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-30 flex items-center gap-1.5 sm:right-5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir a ${name}. Etapa ${level.label}, ${progress.xp} puntos.${unreadCount ? ` ${unreadCount} avisos sin leer.` : ""}`}
        className={`relative flex min-h-12 items-center justify-center gap-2 border bg-[#202d36] text-slate-100 shadow-[0_8px_28px_rgb(0_0_0_/_35%)] transition hover:border-[#b7f34a] active:scale-[0.97] ${unreadCount ? "border-[#b7f34a] mascot-alert-pulse" : "border-[#42515a]"} ${minimized ? "h-14 w-14 rounded-full p-1" : "max-w-48 rounded-full py-1.5 pl-1.5 pr-4"}`}
      >
        <span className="relative shrink-0"><img src={level.image} alt="" className={`object-contain ${minimized ? "h-11 w-11" : "h-10 w-10"}`} />{unreadCount ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-[#202d36] bg-[#b7f34a] px-1 text-[10px] font-black text-[#17210d]" aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}</span>
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
      {unreadCount && latestAlertTitle ? <span role="status" className="pointer-events-none absolute bottom-full right-0 mb-2 max-w-52 rounded-xl border border-[#46564b] bg-[#202d36] px-3 py-2 text-xs font-semibold text-slate-100 shadow-xl">{latestAlertTitle}</span> : null}
    </div>
  );
}
