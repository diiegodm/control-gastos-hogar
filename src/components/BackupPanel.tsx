import type { FinanceData } from "../types";

type BackupPanelProps = {
  data: FinanceData;
  onImport: (data: FinanceData) => Promise<void>;
};

export default function BackupPanel({ data, onImport }: BackupPanelProps) {
  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzas-hogar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file?: File) {
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text) as FinanceData;
    await onImport(parsed);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-bold text-slate-950">Respaldo local</h3>
        <p className="text-sm text-slate-500">Exporta o importa tus datos en JSON. No se envía nada a Internet.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white" onClick={exportJson}>
          Exportar respaldo
        </button>
        <label className="cursor-pointer rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-700">
          Importar respaldo
          <input
            className="hidden"
            type="file"
            accept="application/json"
            onChange={(event) => importJson(event.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
}
