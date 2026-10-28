import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base keeps the built game portable across static hosts
// (Netlify, Vercel, GitHub Pages, or any subdirectory).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
})
