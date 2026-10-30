export type Section = "dashboard" | "spaces" | "analysis" | "profile";

type Props = {
  active: Section;
  onChange: (section: Section) => void;
  onAdd: () => void;
};

const items: Array<{ id: Section; label: string; icon: string }> = [
  { id: "dashboard", label: "Inicio", icon: "⌂" },
  { id: "spaces", label: "Espacios", icon: "▦" },
  { id: "analysis", label: "Análisis", icon: "◔" },
  { id: "profile", label: "Perfil", icon: "○" },
];

export function BottomNav({ active, onChange, onAdd }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 backdrop-blur-xl md:top-[72px] md:bottom-auto md:border-b md:border-t-0">
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-1">
        {items.slice(0, 2).map((item) => (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[0.68rem] font-semibold transition ${active === item.id ? "bg-slate-950 text-white shadow-soft" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
            <span className="text-lg leading-none">{item.icon}</span><span className="mt-1">{item.label}</span>
          </button>
        ))}
        <button type="button" onClick={onAdd} className="mx-auto -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#b7f34a] text-3xl font-medium text-[#18210d] shadow-[0_8px_28px_rgba(183,243,74,0.24)] transition hover:scale-105 active:scale-95" aria-label="Añadir movimiento" title="Añadir movimiento">+</button>
        {items.slice(2).map((item) => (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[0.68rem] font-semibold transition ${active === item.id ? "bg-slate-950 text-white shadow-soft" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
            <span className="text-lg leading-none">{item.icon}</span><span className="mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
