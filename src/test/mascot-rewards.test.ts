import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { awardMascotMovement, configureDatabaseNameForTests, getAll } from "../lib/db";

let id = 0;
vi.stubGlobal("localStorage", { getItem: () => null, removeItem: () => undefined });
vi.stubGlobal("window", { dispatchEvent: () => true });

describe("recompensas XP de Plantita", () => {
  beforeEach(() => {
    configureDatabaseNameForTests(`mascot-rewards-${++id}`);
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("limita a 25 XP diarios y no duplica un movimiento", async () => {
    vi.setSystemTime(new Date("2026-11-09T12:00:00"));
    for (let index = 0; index < 8; index += 1) await awardMascotMovement(`daily-${index}`);
    await awardMascotMovement("daily-0");
    const events = await getAll("mascotEvents");
    expect(events.filter((event) => event.kind === "movement")).toHaveLength(8);
    expect(events.filter((event) => event.kind === "movement").reduce((sum, event) => sum + event.xp, 0)).toBe(25);
  });

  it("premia una sola vez la racha de tres días y la misión de cinco días", async () => {
    const days = [9, 10, 11, 12, 13];
    for (const [index, day] of days.entries()) {
      vi.setSystemTime(new Date(`2026-11-${String(day).padStart(2, "0")}T12:00:00`));
      await awardMascotMovement(`week-${index}`);
    }
    const events = await getAll("mascotEvents");
    expect(events.find((event) => event.id === "streak:2026-11-09")?.xp).toBe(10);
    expect(events.find((event) => event.id === "mission:five-days:2026-11-09")?.xp).toBe(20);
    expect(events.filter((event) => event.id.startsWith("streak:")).length).toBe(1);
    expect(events.filter((event) => event.id.startsWith("mission:five-days:")).length).toBe(1);
  });
});
