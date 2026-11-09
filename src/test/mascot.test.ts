import { describe, expect, it } from "vitest";
import { getMascotProgress } from "../lib/mascot";
import type { MascotEvent } from "../types/mascot";

function xpEvents(xp: number): MascotEvent[] {
  return [{ id: "fixture", xp, reason: "Prueba", kind: "legacy", sourceId: "fixture", occurredAt: "2026-01-01T00:00:00.000Z" }];
}

describe("progreso de Plantita por XP", () => {
  it("respeta los límites de las cuatro etapas", () => {
    expect(getMascotProgress(xpEvents(149))).toMatchObject({ stage: "brote", xp: 149, nextMilestone: 150, remainingXp: 1 });
    expect(getMascotProgress(xpEvents(150))).toMatchObject({ stage: "crecimiento", xp: 150, nextMilestone: 450 });
    expect(getMascotProgress(xpEvents(449))).toMatchObject({ stage: "crecimiento", xp: 449, remainingXp: 1 });
    expect(getMascotProgress(xpEvents(450))).toMatchObject({ stage: "equilibrio", xp: 450, nextMilestone: 1000 });
    expect(getMascotProgress(xpEvents(1000))).toMatchObject({ stage: "prosperidad", xp: 1000, nextMilestone: null, progressPercent: 100 });
  });

  it("suma el libro de eventos sin usar importes financieros", () => {
    const events = [
      { id: "a", xp: 5, reason: "Movimiento", kind: "movement" as const, sourceId: "a", occurredAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", xp: 20, reason: "Misión", kind: "mission" as const, sourceId: "b", occurredAt: "2026-01-02T00:00:00.000Z" },
    ];
    expect(getMascotProgress(events).xp).toBe(25);
  });
});
