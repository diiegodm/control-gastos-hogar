import { monthOption, shiftYearMonth } from "../lib/date";

type Props = {
  value: string;
  onChange: (ym: string) => void;
  label?: string;
};

export function MonthSelector({ value, onChange, label = "Mes seleccionado" }: Props) {
  const selected = monthOption(value);
  return (
    <div className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="flex h-12 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-2 shadow-sm">
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xl font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95"
          aria-label="Mes anterior"
          onClick={() => onChange(shiftYearMonth(value, -1))}
        >
          ‹
        </button>
        <span className="min-w-0 flex-1 text-center text-sm font-bold capitalize text-slate-950" aria-live="polite">
          {selected.label} {selected.year}
        </span>
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xl font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95"
          aria-label="Mes siguiente"
          onClick={() => onChange(shiftYearMonth(value, 1))}
        >
          ›
        </button>
      </div>
    </div>
  );
}
