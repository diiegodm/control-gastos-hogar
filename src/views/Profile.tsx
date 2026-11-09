import { useEffect, useState, type FormEvent } from "react";
import { Card } from "../components/Card";
import { fromCents, parseAmount, toCents } from "../lib/money";
import type { FinancialSettings } from "../types/finance";

type Props = {
  name: string;
  onLock: () => void;
  onExport: () => void;
  onImport: () => void;
  importFeedback?: { type: "success" | "error"; message: string } | null;
  financialSettings: FinancialSettings;
  onSaveFinancialSettings: (settings: FinancialSettings) => Promise<void>;
};

export function Profile({ name, onLock, onExport, onImport, importFeedback, financialSettings, onSaveFinancialSettings }: Props) {
  const [openingBalance, setOpeningBalance] = useState(String(fromCents(financialSettings.openingBalanceCents)));
  const [trackingStartMonth, setTrackingStartMonth] = useState(financialSettings.trackingStartMonth);
  const [balanceError, setBalanceError] = useState("");
  const [balanceSaved, setBalanceSaved] = useState(false);

  useEffect(() => {
    setOpeningBalance(String(fromCents(financialSettings.openingBalanceCents)));
    setTrackingStartMonth(financialSettings.trackingStartMonth);
  }, [financialSettings]);

  async function saveBalanceSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const negative = openingBalance.trim().startsWith("-");
    const parsedBalance = parseAmount(negative ? openingBalance.trim().slice(1) : openingBalance);
    if (parsedBalance === null) {
      setBalanceError("Introduce un saldo inicial válido. Puedes usar coma decimal.");
      setBalanceSaved(false);
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(trackingStartMonth)) {
      setBalanceError("Selecciona un mes de inicio válido.");
      setBalanceSaved(false);
      return;
    }
    try {
      await onSaveFinancialSettings({ openingBalanceCents: toCents(negative ? -parsedBalance : parsedBalance), trackingStartMonth });
      setBalanceError("");
      setBalanceSaved(true);
    } catch {
      setBalanceError("No se pudieron guardar los ajustes del saldo.");
      setBalanceSaved(false);
    }
  }

  return <div className="space-y-5">
    <div><p className="text-sm font-semibold text-slate-400">Preferencias y datos</p><h1 className="mt-1 text-2xl font-black">Perfil</h1></div>
    <Card><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#26351b] text-2xl text-[#b7f34a]">{name.slice(0, 1).toUpperCase()}</div><div><h2 className="text-lg font-black">{name}</h2><p className="text-sm text-slate-400">Perfil guardado en este dispositivo</p></div></div></Card>
    <Card><h2 className="font-black">Tus datos</h2><p className="mt-1 text-sm text-slate-400">Crea respaldos para conservar tus registros al cambiar de dispositivo.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button className="btn-primary" onClick={onExport} type="button">Exportar respaldo</button><button className="btn-secondary" onClick={onImport} type="button">Importar respaldo</button></div>{importFeedback ? <p role={importFeedback.type === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm font-semibold ${importFeedback.type === "error" ? "bg-rose-950/50 text-rose-200" : "bg-emerald-950/50 text-emerald-200"}`}>{importFeedback.message}</p> : null}</Card>
    <Card><h2 className="font-black">Saldo acumulado</h2><p className="mt-1 text-sm text-slate-400">El saldo inicial se combina con ingresos registrados, gastos y cargos fijos marcados como pagados desde el mes de inicio.</p><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void saveBalanceSettings(event)}><label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Saldo inicial (€)</span><input className="input" inputMode="decimal" type="text" value={openingBalance} onChange={(event) => { setOpeningBalance(event.target.value); setBalanceSaved(false); }} placeholder="0,00" /></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Mes de inicio</span><input className="input" type="month" value={trackingStartMonth} onChange={(event) => { setTrackingStartMonth(event.target.value); setBalanceSaved(false); }} required /></label><button className="btn-primary sm:col-span-2" type="submit">Guardar ajustes del saldo</button></form>{balanceError ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-300">{balanceError}</p> : balanceSaved ? <p role="status" className="mt-3 text-sm font-semibold text-[#b7f34a]">Ajustes guardados.</p> : null}</Card>
    <Card><h2 className="font-black">Acceso</h2><p className="mt-1 text-sm text-slate-400">Bloquea la pantalla de la app en este dispositivo.</p><button className="btn-secondary mt-4 w-full" onClick={onLock} type="button">Bloquear aplicación</button><p className="mt-3 text-xs leading-5 text-slate-500">El PIN controla el acceso a la interfaz; los datos locales no están cifrados.</p></Card>
    <p className="px-1 text-center text-xs text-slate-500">Finanzas Hogar · tus datos permanecen en este dispositivo</p>
  </div>;
}
