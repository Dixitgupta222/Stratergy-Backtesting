import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { forexApiDevPlugin } from './scripts/viteForexApi.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] == null) process.env[key] = value
  }

  return {
    plugins: [react(), forexApiDevPlugin()],
    server: {
      port: 3000,
      proxy: {
        '/api/india': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true
        },
        '/api/health': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true
        }
      }
    }
  }
})
