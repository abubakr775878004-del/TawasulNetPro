import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// TawasulNet Pro — Vite Configuration
//
// Key points:
//   • SPA mode: every unknown path falls back to /index.html (no 404 on refresh)
//   • Path alias @/ → src/ for clean imports across the project
//   • Dev server runs on port 8080 and accepts all network interfaces
//   • Build output lands in dist/ — point your hosting root here
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  // ── Development server ─────────────────────────────────────────────────────
  server: {
    host: "::",          // accept connections from all interfaces (LAN + localhost)
    port: 8080,
    strictPort: false,   // if 8080 is busy, try the next available port
  },

  // ── Preview server (used after `vite build`) ───────────────────────────────
  preview: {
    port: 8080,
    strictPort: false,
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  plugins: [
    react(),             // SWC-powered React transform (fast HMR)
  ],

  // ── Path aliases ───────────────────────────────────────────────────────────
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ── Build output ───────────────────────────────────────────────────────────
  build: {
    outDir: "dist",
    emptyOutDir: true,

    // Improve chunk loading: keep vendor libs in a separate chunk
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
