import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const REPO = "dote2011";
const APP = "introduction";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? `/${REPO}/${APP}/` : "/",
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: false,
  },
}));
