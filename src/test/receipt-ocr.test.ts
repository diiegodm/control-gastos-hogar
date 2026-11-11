import { afterEach, describe, expect, it, vi } from "vitest";
import type { Worker } from "tesseract.js";
import { createReceiptRecognizer } from "../lib/receiptOcr";
import { prepareReceiptImage, validateReceiptFile } from "../lib/receiptImage";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  it("prueba las dos orientaciones cuando la lectura inicial tiene confianza baja", async () => {
    const { worker, terminate } = fakeWorker("lectura");
    const resultFor = (text: string, confidence: number) => ({
      jobId: "recognize",
      data: {
        text,
        confidence,
        blocks: [{ paragraphs: [{ lines: [{ text, confidence, bbox: { x0: 1, y0: 2, x1: 30, y1: 12 } }] }] }],
      },
    }) as Awaited<ReturnType<Worker["recognize"]>>;
    vi.mocked(worker.recognize)
      .mockResolvedValueOnce(resultFor("gibberish", 61))
      .mockResolvedValueOnce(resultFor("rotado 180", 68))
      .mockResolvedValueOnce(resultFor("rotado izquierda", 86));
    const progress = vi.fn();
    const recognizer = createReceiptRecognizer();

    const result = await recognizer(blankImage, progress, async () => worker);

    expect(worker.recognize).toHaveBeenCalledTimes(3);
    expect(worker.recognize).toHaveBeenNthCalledWith(2, blankImage, { rotateRadians: Math.PI, rotateAuto: false }, { text: true, blocks: true });
    expect(worker.recognize).toHaveBeenNthCalledWith(3, blankImage, { rotateRadians: Math.PI / 2, rotateAuto: false }, { text: true, blocks: true });
    expect(result.text).toBe("rotado izquierda");
    expect(progress).toHaveBeenCalledWith({ status: "Probando otra orientación de la foto", progress: 0.55 });
    expect(terminate).toHaveBeenCalledOnce();
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

  it("usa el decodificador de Safari si createImageBitmap rechaza una foto", async () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("Formato no compatible")));
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:receipt-test");

    const decodeImage = vi.fn(async () => undefined);
    class ImageMock {
      src = "";
      naturalWidth = 2;
      naturalHeight = 2;
      decode = decodeImage;
    }
    vi.stubGlobal("Image", ImageMock);

    const context = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(16) })),
      putImageData: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: (callback: BlobCallback) => callback(new Blob(["prepared"], { type: "image/jpeg" })),
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });

    const image = new File(["source"], "ticket.heic", { type: "image/heic" });
    const prepared = await prepareReceiptImage(image);

    expect(prepared.type).toBe("image/jpeg");
    expect(decodeImage).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:receipt-test");
  });

  it("gira una foto apaisada para dejar el ticket en vertical antes del OCR", async () => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("createImageBitmap", undefined);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:landscape-ticket");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    class LandscapeImageMock {
      src = "";
      naturalWidth = 4;
      naturalHeight = 3;
      decode = vi.fn(async () => undefined);
    }
    vi.stubGlobal("Image", LandscapeImageMock);
    const context = {
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4 * 3 * 4) })),
      putImageData: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: (callback: BlobCallback) => callback(new Blob(["prepared"], { type: "image/jpeg" })),
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });

    await prepareReceiptImage(new File(["source"], "ticket.jpg", { type: "image/jpeg" }));

    expect(canvas.width).toBe(3);
    expect(canvas.height).toBe(4);
    expect(context.translate).toHaveBeenCalledWith(3, 0);
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
  });
});
