import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  // Absolute site root: multi-page toys share /sounds and /visitors.
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        kuckuck: resolve(__dirname, 'kuckuck/index.html'),
        chunyashka: resolve(__dirname, 'chunyashka/index.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
