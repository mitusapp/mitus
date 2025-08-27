import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4028,
    proxy: {
      '/api': {
        target: 'http://localhost:4029',
        changeOrigin: true
      }
    }
  },
  build: { outDir: 'build' }
})
