import { months } from "../lib/date";

type Props = {
  value: number;
  onChange: (month: number) => void;
};

export function MonthSelector({ value, onChange }: Props) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        Mes seleccionado
      </span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-950 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </label>
  );
}
