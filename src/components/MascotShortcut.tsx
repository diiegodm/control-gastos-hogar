import type { MascotProgress } from "../lib/mascot";
import { MASCOT_LEVELS } from "../types/mascot";

type Props = {
  name: string;
  progress: MascotProgress;
  unreadCount: number;
  minimized: boolean;
  onClick: () => void;
};

export function MascotShortcut({ name, progress, unreadCount, minimized, onClick }: Props) {
  const level = MASCOT_LEVELS.find((item) => item.stage === progress.stage)!;
  return (
    <button type="button" onClick={onClick} aria-label={minimized ? `Mostrar tarjeta de ${name} en Inicio` : `Abrir a ${name}. ${unreadCount} avisos nuevos`} title={minimized ? "Mostrar Plantita en Inicio" : `Abrir ${name}`} className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#3b4a52] bg-[#202d36] transition hover:border-[#b7f34a] active:scale-95">
      <img src={level.image} alt="" className="h-9 w-9 object-contain" />
      {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#b7f34a] px-1 text-[10px] font-black text-[#17210d]">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
    </button>
  );
}
