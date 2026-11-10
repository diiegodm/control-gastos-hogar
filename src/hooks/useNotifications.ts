import { useCallback, useEffect, useMemo, useState } from "react";
import { addNotificationsIfMissing, getAll, getItem, markNotificationsRead, saveNotificationPreferences } from "../lib/db";
import { DEFAULT_NOTIFICATION_PREFERENCES, type FinancialAlert, type NotificationPreferences } from "../types/notifications";

function validPreferences(value: unknown): value is NotificationPreferences {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<NotificationPreferences>;
  return typeof item.device === "boolean" && Boolean(item.inApp)
    && typeof item.inApp?.budget === "boolean" && typeof item.inApp?.goal === "boolean" && typeof item.inApp?.payment === "boolean";
}

function canShowDeviceNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function useNotifications(candidates: FinancialAlert[], enabled: boolean) {
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => canShowDeviceNotifications() ? Notification.permission : "unsupported");

  const refresh = useCallback(async () => {
    const [storedAlerts, record] = await Promise.all([getAll("notifications"), getItem("meta", "notificationPreferences")]);
    setAlerts(storedAlerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setPreferences(validPreferences(record?.value) ? record!.value as NotificationPreferences : DEFAULT_NOTIFICATION_PREFERENCES);
    setLoaded(true);
    setError("");
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([getAll("notifications"), getItem("meta", "notificationPreferences")]).then(([storedAlerts, record]) => {
      if (!active) return;
      setAlerts(storedAlerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setPreferences(validPreferences(record?.value) ? record!.value as NotificationPreferences : DEFAULT_NOTIFICATION_PREFERENCES);
      setLoaded(true);
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los avisos."); setLoaded(true); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const reload = () => void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudieron actualizar los avisos."));
    window.addEventListener("finance-data-restored", reload);
    return () => window.removeEventListener("finance-data-restored", reload);
  }, [refresh]);

  const activeCandidates = useMemo(
    () => enabled ? candidates.filter((item) => preferences.inApp[item.kind]) : [],
    [candidates, enabled, preferences.inApp],
  );

  useEffect(() => {
    if (!loaded || !activeCandidates.length) return;
    let active = true;
    void addNotificationsIfMissing(activeCandidates).then(async (newAlerts) => {
      if (!active) return;
      if (newAlerts.length) {
        setAlerts((current) => [...newAlerts, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        if (preferences.device && permission === "granted" && canShowDeviceNotifications()) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) return;
            for (const alert of newAlerts) await registration.showNotification(alert.title, {
              body: alert.message,
              tag: alert.id,
              icon: "/icons/app-icon-192.png",
              data: { url: "/" },
            });
          } catch { /* Los avisos internos permanecen disponibles si el sistema no los muestra. */ }
        }
      }
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudieron guardar los avisos."));
    return () => { active = false; };
  }, [activeCandidates, loaded, permission, preferences.device]);

  const updatePreferences = useCallback(async (next: NotificationPreferences) => {
    await saveNotificationPreferences(next);
    setPreferences(next);
    setError("");
  }, []);

  const requestDeviceNotifications = useCallback(async () => {
    if (!canShowDeviceNotifications()) return "unsupported" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    const next = { ...preferences, device: result === "granted" };
    await updatePreferences(next);
    return result;
  }, [preferences, updatePreferences]);

  const disableDeviceNotifications = useCallback(async () => {
    await updatePreferences({ ...preferences, device: false });
  }, [preferences, updatePreferences]);

  const markRead = useCallback(async (ids: string[]) => {
    await markNotificationsRead(ids);
    const readAt = new Date().toISOString();
    const changed = new Set(ids);
    setAlerts((current) => current.map((item) => changed.has(item.id) && !item.readAt ? { ...item, readAt } : item));
  }, []);

  const unreadCount = alerts.reduce((count, item) => count + (item.readAt ? 0 : 1), 0);
  return { alerts, preferences, permission, unreadCount, loaded, error, updatePreferences, requestDeviceNotifications, disableDeviceNotifications, markRead, refresh };
}
