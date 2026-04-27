import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file from the current directory
  // The third parameter '' loads all variables instead of just those with VITE_ prefix
  const env = loadEnv(mode, process.cwd(), '');
  
  const odooTarget = env.VITE_ODOO_URL || 'https://erp.maxmin.co.in';
  const odooDB = env.VITE_ODOO_DB || 'stage';

  return {
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
            return `${path}${separator}db=${odooDB}`;
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('Origin', odooTarget);
              proxyReq.setHeader('Referer', `${odooTarget}/web/login?db=${odooDB}`);
              proxyReq.setHeader('X-Odoo-Database', odooDB);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
              proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
            });
          }
        },
      }
    }
  };
});
