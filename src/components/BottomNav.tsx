export type Section = "dashboard" | "movements" | "fixed" | "market" | "nutrition";

type NavItem = {
  id: Section;
  label: string;
  icon: string;
};

const items: NavItem[] = [
  { id: "dashboard", label: "Inicio", icon: "⌂" },
  { id: "movements", label: "Movimientos", icon: "⇄" },
  { id: "fixed", label: "Fijos", icon: "□" },
  { id: "market", label: "Mercado", icon: "▤" },
  { id: "nutrition", label: "Comer", icon: "◐" },
];

type Props = {
  active: Section;
  onChange: (section: Section) => void;
};

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-xs font-semibold transition ${
                selected
                  ? "bg-slate-950 text-white shadow-soft"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
