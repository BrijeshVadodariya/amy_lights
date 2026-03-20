import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:8073',
        changeOrigin: true,
      },
      '/web': {
        target: 'http://localhost:8073',
        changeOrigin: true,
      }
    }
  }
})

