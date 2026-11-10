import { afterEach, describe, expect, it, vi } from "vitest";
import type { Worker } from "tesseract.js";
import { createReceiptRecognizer } from "../lib/receiptOcr";
import { validateReceiptFile } from "../lib/receiptImage";

function fakeWorker(text = "Leche 1,20") {
  const terminate = vi.fn(async () => undefined);
  const worker = {
    setParameters: vi.fn(async () => ({ jobId: "setup", data: {} })),
    recognize: vi.fn(async () => ({
      jobId: "recognize",
      data: {
        text,
        blocks: [{ paragraphs: [{ lines: [{ text, confidence: 92, bbox: { x0: 1, y0: 2, x1: 30, y1: 12 } }] }] }],
      },
    })),
    terminate,
  } as unknown as Worker;
  return { worker, terminate };
}

const blankImage = new Blob(["image"], { type: "image/jpeg" });

afterEach(() => vi.restoreAllMocks());

describe("gestión del worker OCR", () => {
  it("traduce el progreso y termina el worker tras reconocer líneas con confianza y coordenadas", async () => {
    const { worker, terminate } = fakeWorker();
    const recognizer = createReceiptRecognizer();
    const progress = vi.fn();
    const result = await recognizer(blankImage, progress, async (logger) => {
      logger("loading language traineddata", 0.5);
      return worker;
    });

    expect(progress).toHaveBeenCalledWith({ status: "Cargando el idioma español", progress: 0.5 });
    expect(result.text).toBe("Leche 1,20");
    expect(result.lines[0]).toMatchObject({ confidence: 92, bbox: { x0: 1, y0: 2 } });
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("cierra el worker si el reconocimiento falla y devuelve un error en español", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { worker, terminate } = fakeWorker();
    vi.mocked(worker.recognize).mockRejectedValue(new Error("failed to load image"));
    const recognizer = createReceiptRecognizer();

    await expect(recognizer(blankImage, () => undefined, async () => worker))
      .rejects.toThrow("No se pudo abrir la foto");
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("limita la inicialización y no crea workers acumulados si una inicialización sigue bloqueada", async () => {
    let resolveWorker!: (worker: Worker) => void;
    const pendingWorker = new Promise<Worker>((resolve) => { resolveWorker = resolve; });
    const recognizer = createReceiptRecognizer({ initialization: 5 });

    await expect(recognizer(blankImage, () => undefined, async () => pendingWorker))
      .rejects.toThrow("El OCR tardó demasiado");
    await expect(recognizer(blankImage, () => undefined, async () => fakeWorker().worker))
      .rejects.toThrow("Recarga la aplicación");

    const { worker, terminate } = fakeWorker();
    resolveWorker(worker);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});

describe("validación de imágenes", () => {
  it("rechaza archivos vacíos, demasiado grandes y tipos que no son imagen", () => {
    expect(validateReceiptFile({ size: 0, type: "image/jpeg" } as File)).toContain("vacía");
    expect(validateReceiptFile({ size: 20 * 1024 * 1024 + 1, type: "image/jpeg" } as File)).toContain("20 MB");
    expect(validateReceiptFile({ size: 50, type: "application/pdf" } as File)).toContain("no parece ser una imagen");
    expect(validateReceiptFile({ size: 50, type: "image/heic" } as File)).toBeNull();
  });
});
