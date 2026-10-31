import { useState, type FormEvent } from "react";

type Auth = ReturnType<typeof import("../hooks/useLocalAuth").useLocalAuth>;

export function LocalAccess({ auth }: { auth: Auth }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (auth.needsSetup) {
        if (pin.length < 4) {
          setError("El PIN debe tener al menos 4 cifras.");
        } else if (pin !== confirmPin) {
          setError("Los PIN no coinciden.");
        } else {
          await auth.createPin(name, pin);
        }
      } else if (!(await auth.unlock(pin))) {
        setError("PIN incorrecto. Inténtalo de nuevo.");
      }
    } catch {
      setError("No se pudo validar el acceso en este dispositivo.");
    } finally {
      setBusy(false);
    }
  }

  function recoverAccess() {
    const confirmed = confirm("¿Olvidaste el PIN? Puedes crear uno nuevo. Tus finanzas guardadas en este dispositivo no se borrarán, pero cualquiera con acceso físico al dispositivo podrá restablecer el PIN.");
    if (confirmed) auth.resetAccess();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#080b0f] px-5 py-10 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[1.8rem] bg-[#a6ff00] text-4xl text-[#10140b] shadow-[0_0_45px_rgba(166,255,0,0.25)]">
            ⌂
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a6ff00]">Finanzas</p>
          <h1 className="mt-1 text-4xl font-black">Hogar</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-400">
            {auth.needsSetup ? "Tu dinero, tus objetivos, en un solo lugar." : `Hola, ${auth.name}. Tu hogar está a un PIN de distancia.`}
          </p>
        </div>

        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          {auth.needsSetup ? (
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="¿Cómo te llamamos?"
              autoComplete="name"
            />
          ) : null}
          <input
            className="input text-center text-xl tracking-[0.4em]"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            placeholder="PIN"
            autoComplete="current-password"
            required
          />
          {auth.needsSetup ? (
            <input
              className="input text-center text-xl tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
              placeholder="Repite el PIN"
              autoComplete="new-password"
              required
            />
          ) : null}
          {error ? <p className="rounded-xl bg-[#32191e] p-3 text-sm font-semibold text-[#ff8795]">{error}</p> : null}
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? "Un momento..." : auth.needsSetup ? "Crear acceso" : "Entrar"}
          </button>
        </form>

        {!auth.needsSetup ? <button className="mt-4 w-full py-2 text-sm font-bold text-[#b7f34a]" type="button" onClick={recoverAccess}>Olvidé mi PIN</button> : null}

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Acceso local en este dispositivo. Tus datos siguen guardados aquí.
        </p>
      </div>
    </main>
  );
}
