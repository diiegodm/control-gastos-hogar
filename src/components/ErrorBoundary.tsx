import { Component, type ErrorInfo, type ReactNode } from "react";
import { downloadBackup, exportBackup } from "../lib/storage";

type Props = { children: ReactNode };
type State = { hasError: boolean; exportError: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, exportError: null };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en Finanzas Hogar", error, info.componentStack);
  }

  exportData = async () => {
    this.setState({ exportError: null });
    try {
      downloadBackup(await exportBackup());
    } catch (error) {
      this.setState({ exportError: error instanceof Error ? error.message : "No se pudieron exportar los datos." });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return <main className="flex min-h-dvh items-center justify-center bg-[#111820] px-5 text-slate-100"><section className="w-full max-w-md rounded-2xl border border-[#3b4a52] bg-[#202d36] p-5"><h1 className="text-xl font-black">La aplicación encontró un problema</h1><p className="mt-2 text-sm text-slate-300">Puedes intentar exportar los datos locales antes de volver a cargar la aplicación.</p><button className="btn-primary mt-4 w-full" type="button" onClick={() => void this.exportData()}>Exportar datos</button><button className="btn-secondary mt-2 w-full" type="button" onClick={() => window.location.reload()}>Recargar aplicación</button>{this.state.exportError ? <p role="alert" className="mt-3 rounded-xl bg-rose-950/50 p-3 text-sm text-rose-200">{this.state.exportError}</p> : null}</section></main>;
  }
}
