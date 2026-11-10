import { createWorker, PSM, type Worker } from "tesseract.js";
import workerPath from "./receiptWorker.ts?worker&url";
import { prepareReceiptImage } from "./receiptImage";
import type { ReceiptTextLine } from "./receiptParser";

export type OcrProgress = { status: string; progress: number };
export type ReceiptOcrResult = { text: string; lines: ReceiptTextLine[] };

const INITIALIZATION_TIMEOUT_MS = 80_000;
const RECOGNITION_TIMEOUT_MS = 120_000;
const PARAMETER_TIMEOUT_MS = 20_000;

function translatedStatus(status: string): string {
  switch (status.toLocaleLowerCase("en-US")) {
    case "loading tesseract core": return "Cargando el motor de lectura";
    case "initializing tesseract": return "Preparando el motor OCR";
    case "loading language traineddata": return "Cargando el idioma español";
    case "initializing api": return "Preparando el reconocimiento";
    case "recognizing text": return "Leyendo el ticket";
    default: return "Procesando la imagen del ticket";
  }
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => { globalThis.clearTimeout(timer); resolve(value); },
      (error: unknown) => { globalThis.clearTimeout(timer); reject(error); },
    );
  });
}

type ReceiptWorker = Pick<Worker, "setParameters" | "recognize" | "terminate">;
type ReceiptRecognition = Awaited<ReturnType<Worker["recognize"]>>;
type WorkerFactory = (logger: (status: string, progress: number) => void) => Promise<ReceiptWorker>;

function getOcrLines(result: ReceiptRecognition): ReceiptTextLine[] {
  const pageLines = (result.data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));
  const lines = pageLines
    .filter((line) => line.text.trim())
    .map((line) => ({
      text: line.text.trim(),
      confidence: line.confidence,
      bbox: { x0: line.bbox.x0, y0: line.bbox.y0, x1: line.bbox.x1, y1: line.bbox.y1 },
    }));
  if (lines.length) return lines.sort((a, b) => a.bbox!.y0 - b.bbox!.y0 || a.bbox!.x0 - b.bbox!.x0);
  return result.data.text.split(/\r?\n/).filter((text) => text.trim()).map((text) => ({ text: text.trim() }));
}

function readableError(error: unknown): Error {
  const detail = error instanceof Error ? error.message.toLocaleLowerCase("en-US") : String(error).toLocaleLowerCase("en-US");
  if (detail.includes("superó el tiempo") || detail.includes("tiempo permitido")) return new Error("El OCR tardó demasiado. Puedes volver a intentarlo o introducir el ticket manualmente.");
  if (detail.includes("image") || detail.includes("file could not be read")) return new Error("No se pudo abrir la foto. Elige otra imagen o introduce el ticket manualmente.");
  if (detail.includes("network") || detail.includes("fetch") || detail.includes("failed to load")) return new Error("No se pudieron cargar los recursos locales del OCR. Comprueba la conexión e inténtalo de nuevo.");
  return new Error("No se pudo leer la foto. Prueba con una imagen más nítida o introduce los datos manualmente.");
}

export async function recognizeReceipt(file: File, onProgress: (progress: OcrProgress) => void): Promise<ReceiptOcrResult> {
    const image = await prepareReceiptImage(file);
  const base = import.meta.env.BASE_URL;
  return receiptRecognizer(image, onProgress, (logger) => createWorker("spa", 1, {
    workerPath,
    workerBlobURL: false,
    corePath: `${base}ocr/core`,
    langPath: `${base}ocr/lang`,
    cachePath: "finanzas-hogar-ocr-spa-v2",
    cacheMethod: "none",
    gzip: true,
    logger: ({ status, progress }) => logger(status, progress),
  }));
}

export function createReceiptRecognizer(
  timeouts: { initialization?: number; parameters?: number; recognition?: number } = {},
) {
  let pendingInitialization: Promise<ReceiptWorker> | null = null;
  return async function receiptRecognizer(
    image: Blob,
    onProgress: (progress: OcrProgress) => void,
    create: WorkerFactory,
  ): Promise<ReceiptOcrResult> {
    if (pendingInitialization) throw new Error("El lector anterior no respondió. Recarga la aplicación antes de volver a escanear.");
    let abandoned = false;
    let worker: ReceiptWorker | null = null;
    const initialization = create((status, progress) => onProgress({
      status: translatedStatus(status),
      progress: Math.max(0, Math.min(1, progress)),
    })).then(async (created) => {
      if (abandoned) {
        await created.terminate();
        throw new Error("La inicialización del OCR superó el tiempo permitido.");
      }
      return created;
    });
    pendingInitialization = initialization;
    void initialization.then(
      () => { if (pendingInitialization === initialization) pendingInitialization = null; },
      () => { if (pendingInitialization === initialization) pendingInitialization = null; },
    );

    try {
      worker = await withTimeout(initialization, timeouts.initialization ?? INITIALIZATION_TIMEOUT_MS, "La inicialización del OCR superó el tiempo permitido.");
      await withTimeout(worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1" }), timeouts.parameters ?? PARAMETER_TIMEOUT_MS, "La preparación del OCR superó el tiempo permitido.");
      const result = await withTimeout(
        worker.recognize(image, { rotateAuto: true }, { text: true, blocks: true }),
        timeouts.recognition ?? RECOGNITION_TIMEOUT_MS,
        "El reconocimiento superó el tiempo permitido.",
      );
      return { text: result.data.text, lines: getOcrLines(result) };
    } catch (error) {
      abandoned = true;
      console.warn("Fallo del lector local de tickets", error);
      throw readableError(error);
    } finally {
      if (worker) {
        try { await worker.terminate(); } catch { /* El watchdog pudo cerrar el worker. */ }
      }
    }
  };
}

const receiptRecognizer = createReceiptRecognizer();
