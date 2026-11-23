import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Separate from vite.config.ts so Vitest doesn't load the Lovable/TanStack Start plugins.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
