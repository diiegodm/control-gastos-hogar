import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { configureDatabaseNameForTests, getAll } from "../lib/db";

vi.stubGlobal("localStorage", { getItem: () => null, removeItem: () => undefined });

describe("reintento de apertura de IndexedDB", () => {
  it("no conserva una promesa rechazada y permite reabrir la base", async () => {
    configureDatabaseNameForTests("open-retry-test");
    const open = vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
      throw new Error("IndexedDB no disponible temporalmente");
    });

    await expect(getAll("movements")).rejects.toThrow("IndexedDB no disponible temporalmente");
    open.mockRestore();
    await expect(getAll("movements")).resolves.toEqual([]);
  });
});
