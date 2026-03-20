import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const odooTarget = process.env.VITE_ODOO_URL || 'http://103.212.121.196:8069';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.', 'localhost'],
    proxy: {
      '^/(api|web|my)': {
        target: odooTarget,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
        rewrite: (path) => {
          const separator = path.includes('?') ? '&' : '?';
          return `${path}${separator}db=stage`;
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', odooTarget);
            proxyReq.setHeader('Referer', `${odooTarget}/web/login?db=stage`);
            proxyReq.setHeader('X-Odoo-Database', 'stage');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
          });
        }
      },
    }
  }
})
