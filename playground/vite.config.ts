import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const playgroundDir = path.dirname(fileURLToPath(import.meta.url))
const effectsPackageRoot = path.resolve(playgroundDir, '..')

export default defineConfig({
  server: {
    port: 5173,
    // Local file: package — watch the repo root so lib rebuilds are picked up.
    watch: {
      ignored: ['!**/node_modules/phaser-vfx-effects/**'],
    },
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    dedupe: ['phaser'],
    // Prefer the live package root (exports → dist/) over a stale install copy.
    alias: {
      'phaser-vfx-effects': effectsPackageRoot,
    },
  },
  optimizeDeps: {
    // Do not prebundle the local effects package — stale .vite/deps hid new effects.
    exclude: ['phaser-vfx-effects'],
  },
})
