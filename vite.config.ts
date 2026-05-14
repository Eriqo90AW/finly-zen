import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  plugins: [devtools(), solidPlugin(), tailwindcss()],
  optimizeDeps: {
    include: ["solid-js", "solid-js/store", "@solid-devtools/shared"],
  },
  server: {
    port: 3077,
    host: "0.0.0.0",
    allowedHosts: ["finlyzen.ercloud.site"],
  },
  build: {
    target: "esnext",
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: ["finlyzen.ercloud.site"],
  },
});
