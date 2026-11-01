export function currency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function parseAmount(input: string): number | null {
  let value = input.trim().replace(/[\s\u00a0\u202f]/g, "").replace(/€/g, "");
  if (!value || !/^[0-9.,]+$/.test(value)) return null;

  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? /\./g : /,/g;
    value = value.replace(grouping, "").replace(decimal, ".");
  } else if (comma >= 0) {
    if ((value.match(/,/g)?.length ?? 0) > 1) {
      const chunks = value.split(",");
      if (chunks.slice(1, -1).some((chunk) => chunk.length !== 3)) return null;
      value = `${chunks.slice(0, -1).join("")}.${chunks[chunks.length - 1]}`;
    } else {
      value = value.replace(",", ".");
    }
  } else if ((value.match(/\./g)?.length ?? 0) > 1) {
    const chunks = value.split(".");
    if (chunks.slice(1, -1).some((chunk) => chunk.length !== 3)) return null;
    value = `${chunks.slice(0, -1).join("")}.${chunks[chunks.length - 1]}`;
  }

  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function numberValue(value: FormDataEntryValue | null): number {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
