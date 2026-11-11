const idleTimeoutMs = 105_000;
const fetchTimeoutMs = 45_000;
let lastActivity = Date.now();

const nativePostMessage = self.postMessage.bind(self);
const nativeFetch = self.fetch.bind(self);

self.addEventListener("message", () => {
  lastActivity = Date.now();
});

self.postMessage = (message, transfer) => {
  lastActivity = Date.now();
  nativePostMessage(message, transfer);
};

self.fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
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
  if (Date.now() - lastActivity > idleTimeoutMs) self.close();
}, 5_000);

importScripts("./worker.min.js");
