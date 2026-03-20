import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://103.212.121.196:8069/',
        changeOrigin: true,
      },
      '/web': {
        target: 'http://103.212.121.196:8069/',
        changeOrigin: true,
      }
    }
  }
})