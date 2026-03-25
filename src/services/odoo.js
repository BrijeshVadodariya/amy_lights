import axios from 'axios';

const DEFAULT_TIMEOUT_MS = 15000;

const api = axios.create({
  baseURL: '', // Use empty string to avoid "//" prefix, keeping paths relative to origin
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
});

const BUILD_ID = '2026-03-20-1922'; // Manual build tag to verify deployment
console.log(`[OdooService] Deployment Build: ${BUILD_ID}`);

if (import.meta.env.PROD) {
  console.log('[OdooService] Production mode: API baseURL is', api.defaults.baseURL);
}

// Request interceptor to add session ID from localStorage
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('odoo_session_id');
  if (sessionId) {
    // Standard Bearer Token authentication (Revision 6)
    config.headers['Authorization'] = `Bearer ${sessionId}`;
    // Fallback for custom backend checks
    config.headers['X-Odoo-Session-ID'] = sessionId;
  }
  
  console.log(`[OdooService] Request: ${config.method?.toUpperCase()} ${config.url}`, {
    fullURL: `${config.baseURL}${config.url}`,
    params: config.params,
    headers: config.headers
  });
  
  return config;
});

// Response interceptor for detailed logging
api.interceptors.response.use(
  (response) => {
    console.log(`[OdooService] Response: ${response.status} from ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`[OdooService] Error: ${error.response?.status || 'Network Error'} from ${error.config?.url}`, {
      message: error.message,
      data: error.response?.data,
      headers: error.response?.headers
    });
    return Promise.reject(error);
  }
);

export const getOdooErrorMessage = (error, fallback = 'Request to Odoo failed.') => {
  const backendMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.result?.error?.message;

  if (backendMessage) {
    return backendMessage;
  }

  if (error?.code === 'ECONNABORTED') {
    return `Odoo did not respond within ${DEFAULT_TIMEOUT_MS / 1000} seconds.`;
  }

  if (error?.message === 'Network Error') {
    return 'Unable to reach the Odoo server. Check the server URL, VPN/firewall, or Vite proxy target.';
  }

  console.error('Odoo API Error:', error);
  return error?.message || fallback;
};

export const odooService = {
  getOdooUrl: () => {
    return import.meta.env.VITE_ODOO_URL || 'http://localhost:8073';
  },
  login: async (login, password) => {
    const res = await api.post('/api/login', {
      params: { login, password, db: import.meta.env.VITE_ODOO_DB || 'stage' }
    });
    const result = res.data.result;
    if (result && result.success && result.data && result.data.session_id) {
      localStorage.setItem('odoo_session_id', result.data.session_id);
    }
    return result || { success: false, error: res.data.error };
  },
  logout: async () => {
    localStorage.removeItem('odoo_session_id');
    const res = await api.post('/api/logout', { params: {} });
    return res.data.result || { success: false, error: res.data.error };
  },
  getOrders: async (limit = 100, offset = 0, sort = 'date_order desc', state_type = 'all') => {
    const res = await api.post('/api/orders', {
      params: { limit, offset, sort, state_type }
    });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getPurchaseOrders: async (limit = 100, offset = 0) => {
    const res = await api.post('/api/purchase_orders', {
      params: { limit, offset }
    });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getStats: async () => {
    const res = await api.post('/api/dashboard/stats', { params: {} });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getMasterData: async () => {
    const res = await api.post('/api/master_data', { params: {} });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  createQuotation: async (partnerId, lines, extra = {}) => {
    const res = await api.post('/api/quote/create', {
      params: { partner_id: partnerId, lines, ...extra }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  updateQuotation: async (orderId, partnerId, lines, extra = {}) => {
    const res = await api.post('/api/quote/create', {
      params: { 
        order_id: orderId, 
        partner_id: partnerId, 
        lines, 
        ...extra 
      }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  createPartner: async (partnerData) => {
    const res = await api.post('/api/partner/create', { params: partnerData });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  createProduct: async (productData) => {
    const res = await api.post('/api/product/create', { params: productData });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getProducts: async (limit = 100, offset = 0) => {
    const res = await api.post('/api/products', { params: { limit, offset } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getPartners: async () => {
    const res = await api.post('/api/partners', { params: { limit: 10000 } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getProductDetail: async (productId) => {
    const res = await api.post('/api/products/detail', { params: { product_id: productId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getOrderDetail: async (orderId) => {
    const res = await api.post('/api/orders/detail', { params: { order_id: orderId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  confirmOrder: async (orderId) => {
    const res = await api.post('/api/orders/confirm', { params: { order_id: orderId } });
    return res.data.result || { success: false, error: res.data.error };
  },
  declineOrder: async (orderId, message = "") => {
    const res = await api.post('/api/orders/decline', { params: { order_id: orderId, message } });
    return res.data.result || { success: false, error: res.data.error };
  },
  convertSelection: async (orderId, targetState = 'draft') => {
    const res = await api.post('/api/orders/convert_selection', { params: { order_id: orderId, target_state: targetState } });
    return res.data.result || { success: false, error: res.data.error };
  }
};
