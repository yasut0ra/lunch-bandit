import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages(https://<user>.github.io/lunch-bandit/)配下で動かすため
  base: mode === 'production' ? '/lunch-bandit/' : '/',
  server: { port: 5173, strictPort: true },
  test: { environment: 'node' },
}))
