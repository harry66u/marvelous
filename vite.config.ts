import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { devApi } from './src/server/devApi'

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi()],
  // `--mode static`: relative asset paths so the static preview works from any URL
  base: mode === 'static' ? './' : '/',
  build: { target: 'es2022', sourcemap: mode !== 'static', chunkSizeWarningLimit: 300, outDir: mode === 'static' ? 'dist-preview' : 'dist' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts', 'scripts/**/*.test.ts', 'content/**/*.test.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}))
