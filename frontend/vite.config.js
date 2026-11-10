import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ['tesseract.js'] },
  server: {
    port: 5173,
    proxy: {
      '^/api/stocks/[A-Z0-9]{6}/(analysis|fundamentals|ratings)(\\?.*)?$': {
        target: 'http://127.0.0.1:8011',
        changeOrigin: true,
      },
    },
  },
})
