import "tesseract.js/src/worker-script/browser/index.js";

type ReceiptWorkerScope = {
  addEventListener: (type: "message", listener: () => void) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  close: () => void;
  fetch: typeof fetch;
};

const scope = self as unknown as ReceiptWorkerScope;
const nativePostMessage = scope.postMessage.bind(scope);
const nativeFetch = scope.fetch.bind(scope);
let lastActivity = Date.now();

scope.addEventListener("message", () => { lastActivity = Date.now(); });
scope.postMessage = (message, transfer) => {
  lastActivity = Date.now();
  nativePostMessage(message, transfer);
};
scope.fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    return await nativeFetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("La carga local del OCR superó el tiempo permitido.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

setInterval(() => {
  if (Date.now() - lastActivity > 105_000) scope.close();
}, 5_000);
