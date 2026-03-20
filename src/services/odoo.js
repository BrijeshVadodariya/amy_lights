import axios from 'axios';

const api = axios.create({
  baseURL: '', // Odoo server URL, blank if same origin
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const odooService = {
  login: async (login, password) => {
    const res = await api.post('/api/login', {
      params: { login, password, db: 'amy_lights' }
    });
    return res.data.result;
  },
  logout: async () => {
    const res = await api.post('/api/logout', { params: {} });
    return res.data.result;
  },
  getOrders: async (limit = 100, offset = 0, sort = 'date_order desc', state_type = 'all') => {
    const res = await api.post('/api/orders', {
      params: { limit, offset, sort, state_type }
    });
    return res.data.result.data;
  },
  getPurchaseOrders: async (limit = 100, offset = 0) => {
    const res = await api.post('/api/purchase_orders', {
      params: { limit, offset }
    });
    return res.data.result.data;
  },
  getStats: async () => {
    const res = await api.post('/api/dashboard/stats', { params: {} });
    return res.data.result.data;
  },
  getMasterData: async () => {
    const res = await api.post('/api/master_data', { params: {} });
    // In some cases we return the full result object, in others just the data
    const result = res.data.result;
    return result.data || result; 
  },
  createQuotation: async (partnerId, lines, extra = {}) => {
    const res = await api.post('/api/quote/create', {
      params: { partner_id: partnerId, lines, ...extra }
    });
    return res.data.result;
  },
  createPartner: async (partnerData) => {
    const res = await api.post('/my/partner/create', { params: partnerData });
    return res.data.result;
  },
  createProduct: async (productData) => {
    const res = await api.post('/my/product/create', { params: productData });
    return res.data.result;
  },
  createQuickQuote: async (items) => {
    const res = await api.post('/my/catalog/quick-quote', { params: { items } });
    return res.data.result;
  },
  getProducts: async () => {
    const res = await api.post('/api/products', { params: { limit: 1000 } });
    return res.data.result.data;
  },
  getProductDetail: async (productId) => {
    const res = await api.post('/api/products/detail', { params: { product_id: productId } });
    return res.data.result.data;
  },
  getOrderDetail: async (orderId) => {
    const res = await api.post('/api/orders/detail', { params: { order_id: orderId } });
    return res.data.result.data;
  },
  confirmOrder: async (orderId) => {
    const res = await api.post('/api/orders/confirm', { params: { order_id: orderId } });
    return res.data.result;
  },
  declineOrder: async (orderId, message = "") => {
    const res = await api.post('/api/orders/decline', { params: { order_id: orderId, message } });
    return res.data.result;
  }
};
