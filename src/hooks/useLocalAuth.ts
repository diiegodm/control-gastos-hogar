import { useEffect, useState } from "react";

const CREDENTIALS_KEY = "finanzas-hogar-local-access-v1";
const SESSION_KEY = "finanzas-hogar-session-v1";

type Credentials = { salt: string; digest: string; name: string };

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
}

function readCredentials(): Credentials | null {
  try {
    const value = localStorage.getItem(CREDENTIALS_KEY);
    return value ? (JSON.parse(value) as Credentials) : null;
  } catch {
    return null;
  }
}

export function useLocalAuth() {
  const [credentials, setCredentials] = useState<Credentials | null>(() => readCredentials());
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "open");
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  async function createPin(name: string, pin: string) {
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const next = { salt, digest: await hashPin(pin, salt), name: name.trim() || "Mi hogar" };
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(next));
    sessionStorage.setItem(SESSION_KEY, "open");
    setCredentials(next);
    setUnlocked(true);
  }

  async function unlock(pin: string) {
    if (!credentials) return false;
    const digest = await hashPin(pin, credentials.salt);
    if (digest !== credentials.digest) return false;
    sessionStorage.setItem(SESSION_KEY, "open");
    setUnlocked(true);
    return true;
  }

  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  }

  return { ready, needsSetup: !credentials, unlocked, name: credentials?.name ?? "Mi hogar", createPin, unlock, lock };
}
