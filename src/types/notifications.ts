export type FinancialAlertKind = "budget" | "goal" | "payment" | "spending";
export type FinancialAlertLevel = "info" | "warning" | "critical";

export type FinancialAlert = {
  id: string;
  kind: FinancialAlertKind;
  level: FinancialAlertLevel;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
};

export type NotificationPreferences = {
  inApp: Record<FinancialAlertKind, boolean>;
  device: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: { budget: true, goal: true, payment: true, spending: true },
  device: false,
};
