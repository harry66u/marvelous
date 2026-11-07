import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { devApi } from './src/server/devApi'

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi()],
  resolve: {
    alias: {
      // The static preview ships its data inside the bundle: some hosts serve the page's scripts but
      // refuse its data requests. Every other build gets an empty stub.
      'virtual:preview-data': fileURLToPath(
        new URL(mode === 'static' ? './src/generated/preview-data.json' : './src/data/preview-data.stub.json', import.meta.url),
      ),
    },
  },
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
