import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: rootDir,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [resolve(rootDir, '__tests__/setup.ts')],
    include: ['**/__tests__/**/*.test.ts?(x)'],
  },
  resolve: {
    alias: {
      '@rotating-machine': rootDir,
    },
  },
})
