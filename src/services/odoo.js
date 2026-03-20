import axios from 'axios';

const DEFAULT_TIMEOUT_MS = 15000;

const api = axios.create({
  baseURL: '/', // Use relative path to trigger Vite proxy
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
});

// Request interceptor to add session ID from localStorage
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('odoo_session_id');
  if (sessionId) {
    // Standard Bearer Token authentication (Revision 6)
    config.headers['Authorization'] = `Bearer ${sessionId}`;
    // Fallback for custom backend checks
    config.headers['X-Odoo-Session-ID'] = sessionId;
  }
  return config;
});

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

  return error?.message || fallback;
};

export const odooService = {
  login: async (login, password) => {
    const res = await api.post('/api/login', {
      params: { login, password, db: 'stage' }
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
  createPartner: async (partnerData) => {
    const res = await api.post('/my/partner/create', { params: partnerData });
    return res.data.result || { success: false, error: res.data.error };
  },
  createProduct: async (productData) => {
    const res = await api.post('/my/product/create', { params: productData });
    return res.data.result || { success: false, error: res.data.error };
  },
  createQuickQuote: async (items) => {
    const res = await api.post('/my/catalog/quick-quote', { params: { items } });
    return res.data.result || { success: false, error: res.data.error };
  },
  getProducts: async () => {
    const res = await api.post('/api/products', { params: { limit: 1000 } });
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
  }
};
