import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const REPO = "dote2011";
const APP = "hypothesis-tests";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? `/${REPO}/${APP}/` : "/",
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: false,
  },
}));
