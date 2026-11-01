import { describe, expect, it } from "vitest";
import backup from "./fixtures/backup-v1.json";

describe("fixture de respaldo v1", () => {
  it("incluye todos los registros principales y los espacios locales", () => {
    expect(backup.version).toBe(1);
    expect(backup.movements).toHaveLength(1);
    expect(backup.fixedExpenses).toHaveLength(1);
    expect(backup.products).toHaveLength(1);
    expect(backup.purchases).toHaveLength(1);
    expect(backup.spaces.budgets).toHaveLength(1);
    expect(backup.spaces.goals).toHaveLength(1);
    expect(backup.spaces.movementCategories).toContain("Estudios");
  });
});
