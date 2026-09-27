import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const REPO = "dote2011";
const APP = "continuous-distributions";
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(rootDir, "../shared");

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? `/${REPO}/${APP}/` : "/",
  resolve: {
    alias: {
      "@shared": sharedDir,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5177,
    strictPort: false,
    fs: {
      allow: [rootDir, sharedDir],
    },
  },
}));
