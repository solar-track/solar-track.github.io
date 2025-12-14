import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  base: '/', // Root path for username.github.io
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.json')) {
            return 'data/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  publicDir: 'public' // Copy everything from public/ to dist/
})

