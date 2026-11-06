import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { devApi } from './src/server/devApi'

export default defineConfig({
  plugins: [react(), devApi()],
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 300 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts', 'scripts/**/*.test.ts', 'content/**/*.test.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
