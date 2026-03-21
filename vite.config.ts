/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL ?? "/",
  server: {
    host: true, // listen on 0.0.0.0 for local network access
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
