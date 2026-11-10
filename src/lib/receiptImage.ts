const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2600;
const MAX_IMAGE_PIXELS = 5_000_000;
const IMAGE_DECODE_TIMEOUT_MS = 20_000;

export function validateReceiptFile(file: File): string | null {
  if (file.size <= 0) return "La imagen está vacía. Elige otra foto.";
  if (file.size > MAX_FILE_BYTES) return "La foto supera los 20 MB. Elige una imagen más pequeña.";
  if (file.type && !file.type.startsWith("image/")) return "El archivo seleccionado no parece ser una imagen.";
  return null;
}

function timed<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error: unknown) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    const decode = createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const bitmap = await timed(decode, IMAGE_DECODE_TIMEOUT_MS, "La foto tardó demasiado en abrirse.");
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      void decode.then((bitmap) => bitmap.close()).catch(() => undefined);
    }
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await timed(image.decode(), IMAGE_DECODE_TIMEOUT_MS, "El iPhone tardó demasiado en abrir la foto.");
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("El navegador no pudo abrir esta imagen.");
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Safari no pudo abrir esta foto. Prueba con una imagen JPEG o PNG de la galería.");
  }
}

export async function prepareReceiptImage(file: File): Promise<Blob> {
  const fileError = validateReceiptFile(file);
  if (fileError) throw new Error(fileError);

  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) throw new Error("La imagen no tiene dimensiones válidas.");
    const scale = Math.min(
      1,
      MAX_IMAGE_EDGE / Math.max(decoded.width, decoded.height),
      Math.sqrt(MAX_IMAGE_PIXELS / (decoded.width * decoded.height)),
    );
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No se pudo preparar la imagen en este dispositivo.");
    context.drawImage(decoded.source, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.18 + 128));
      pixels.data[index] = contrasted;
      pixels.data[index + 1] = contrasted;
      pixels.data[index + 2] = contrasted;
    }
    context.putImageData(pixels, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo preparar la foto. Prueba con otra imagen.")), "image/jpeg", 0.92);
    });
  } finally {
    decoded.release();
  }
}
