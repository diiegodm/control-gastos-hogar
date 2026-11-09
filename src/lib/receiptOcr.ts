import { createWorker, PSM } from "tesseract.js";

export type OcrProgress = { status: string; progress: number };

const MAX_IMAGE_DIMENSION = 1800;

async function prepareReceiptImage(file: File): Promise<Blob> {
  let source: CanvasImageSource;
  let sourceWidth: number;
  let sourceHeight: number;
  let bitmap: ImageBitmap | undefined;
  let objectUrl: string | undefined;

  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      source = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
    } catch {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      source = image;
      sourceWidth = image.naturalWidth;
      sourceHeight = image.naturalHeight;
    }
  } else {
    objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    source = image;
    sourceWidth = image.naturalWidth;
    sourceHeight = image.naturalHeight;
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("No se pudo preparar la imagen del ticket.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const prepared = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo preparar la imagen del ticket.")), "image/jpeg", 0.88);
    });
    return prepared;
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function recognizeReceipt(image: File, onProgress: (progress: OcrProgress) => void): Promise<string> {
  const base = import.meta.env.BASE_URL;
  onProgress({ status: "Preparando imagen", progress: 0 });
  const preparedImage = await prepareReceiptImage(image);
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    worker = await createWorker("spa", 1, {
      workerPath: `${base}ocr/worker.min.js`,
      workerBlobURL: false,
      corePath: `${base}ocr/core`,
      langPath: `${base}ocr/lang`,
      cachePath: "finanzas-hogar-ocr-spa-v1",
      cacheMethod: "write",
      gzip: true,
      logger: ({ status, progress }) => onProgress({ status, progress }),
    });
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const result = await worker.recognize(preparedImage);
    return result.data.text;
  } finally {
    if (worker) await worker.terminate();
  }
}
