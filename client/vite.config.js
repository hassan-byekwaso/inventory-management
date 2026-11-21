import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { transformWithEsbuild } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "jsx-in-client-js",
      enforce: "pre",
      async transform(code, id) {
        if (/[/\\]client[/\\].*\.js$/.test(id)) {
          return transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic" });
        }
        return null;
      }
    },
    react()
  ],
  esbuild: { jsx: "automatic" },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/")) return "react-vendor";
          if (id.includes("/node_modules/recharts/") || id.includes("/node_modules/d3-")) return "charts";
          if (id.includes("/node_modules/lucide-react/")) return "icons";
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
