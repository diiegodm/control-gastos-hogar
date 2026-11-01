import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { getAll } from "../lib/storage";

describe("reintento de apertura de IndexedDB", () => {
  it("no conserva una promesa rechazada y permite reabrir la base", async () => {
    const open = vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
      throw new Error("IndexedDB no disponible temporalmente");
    });

    await expect(getAll("movements")).rejects.toThrow("IndexedDB no disponible temporalmente");
    open.mockRestore();
    await expect(getAll("movements")).resolves.toEqual([]);
  });
});
