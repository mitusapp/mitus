import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4028,
    proxy: {
      // Cuando uses `vercel dev`, las serverless functions viven en :3000.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // Vercel espera `dist` como directorio de salida del build de Vite
  build: { outDir: 'dist' }
})
