import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "wasm-feature-detect": fileURLToPath(new URL("./src/lib/wasmFeatureDetectShim.ts", import.meta.url)),
    },
  },
  worker: {
    rollupOptions: {
      output: { entryFileNames: "assets/receipt-worker.js" },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
