import { createWorker, PSM } from "tesseract.js";
import workerPath from "tesseract.js/src/worker-script/browser/index.js?worker&url";

export type OcrProgress = { status: string; progress: number };

export async function recognizeReceipt(image: File, onProgress: (progress: OcrProgress) => void): Promise<string> {
  const base = import.meta.env.BASE_URL;
  const worker = await createWorker("spa", 1, {
    workerPath,
    workerBlobURL: false,
    corePath: `${base}ocr/core`,
    langPath: `${base}ocr/lang`,
    cachePath: "finanzas-hogar-ocr-spa-v1",
    cacheMethod: "write",
    gzip: true,
    logger: ({ status, progress }) => onProgress({ status, progress }),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const result = await worker.recognize(image, { rotateAuto: true });
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}
