import axios from 'axios';

const DEFAULT_TIMEOUT_MS = 30000;

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
    return import.meta.env.VITE_ODOO_URL || 'https://erp.maxmin.co.in';
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
  getOrders: async (limit = 100, offset = 0, sort = 'id desc', state_type = 'all') => {
    const res = await api.post('/api/orders', {
      params: { limit, offset, sort, state_type }
    });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getStats: async () => {
    const res = await api.post('/api/dashboard/stats', { params: {} });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getMasterData: async (types = []) => {
    const res = await api.post('/api/master_data', { params: { types } });
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
  updatePartner: async (partnerId, partnerData) => {
    const res = await api.post('/api/partner/create', { params: { partner_id: partnerId, ...partnerData } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getPartnerDetail: async (partnerId) => {
    const res = await api.post('/api/partners/detail', { params: { partner_id: partnerId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  gstLookup: async (vat) => {
    const res = await api.post('/api/gst/lookup', { params: { vat } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
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
  getPartnerDetail: async (partnerId) => {
    const res = await api.post('/api/partners/detail', { params: { partner_id: partnerId } });
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
  getPickings: async (orderId, pickingId = null) => {
    const res = await api.post('/api/order/pickings', { params: { order_id: orderId, picking_id: pickingId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  performPickingAction: async (pickingId, action) => {
    const res = await api.post('/api/picking/action', { params: { picking_id: pickingId, action } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result || { success: false, error: 'Network error' };
  },
  getPurchases: async (orderId, purchaseId = null) => {
    const res = await api.post('/api/order/purchases', { params: { order_id: orderId, purchase_id: purchaseId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getAllPurchases: async (params = {}) => {
    const res = await api.post('/api/purchases', { params });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  createUser: async (userData) => {
    const res = await api.post('/api/user/create', { params: userData });
    const result = res.data.result || { success: false, error: res.data.error };
    return result || { success: false, error: 'Network error' };
  },
  getTeam: async () => {
    const res = await api.post('/api/user/team', { params: {} });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  updateUser: async (userData) => {
    const res = await api.post('/api/user/update', { params: userData });
    const result = res.data.result || { success: false, error: res.data.error };
    return result || { success: false, error: 'Network error' };
  },
  getPurchaseDetail: async (purchaseId) => {
    const res = await api.post('/api/order/purchases', { params: { purchase_id: purchaseId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  performPurchaseAction: async (purchaseId, action) => {
    const res = await api.post('/api/purchase/action', { params: { purchase_id: purchaseId, action } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result || { success: false, error: 'Network error' };
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
  },
  createPurchase: async (data) => {
    const res = await api.post('/api/purchase/create', { params: data });
    return res.data.result || { success: false, error: res.data.error };
  },
  updatePartnerFlags: async (partnerId, flags) => {
    const res = await api.post('/api/partner/update_flags', { params: { partner_id: partnerId, ...flags } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  deletePartner: async (partnerId) => {
    const res = await api.post('/api/partner/delete', { params: { partner_id: partnerId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getCompanyInfo: async () => {
    const res = await api.post('/api/company_info', { params: {} });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getCRMLeads: async (type = 'all', limit = 100, offset = 0, stageId = null, dateFrom = null, dateTo = null) => {
    const res = await api.post('/api/crm/list', { 
      params: { 
        type, 
        limit, 
        offset,
        stage_id: stageId,
        date_from: dateFrom,
        date_to: dateTo
      } 
    });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getCRMStages: async () => {
    const res = await api.post('/api/crm/stages', { params: {} });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  getCRMLeadDetail: async (leadId) => {
    const res = await api.post('/api/crm/detail', { params: { lead_id: leadId } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  createCRMLead: async (leadData) => {
    const res = await api.post('/api/crm/create', { params: leadData });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  updateCRMLead: async (leadId, leadData) => {
    const res = await api.post('/api/crm/update', { params: { id: leadId, ...leadData } });
    const result = res.data.result || { success: false, error: res.data.error };
    return result.data || result;
  },
  printQuotation: (orderId) => {
    const token = localStorage.getItem('odoo_session_id') || '';
    const db = import.meta.env.VITE_ODOO_DB || 'stage';
    const baseUrl = odooService.getOdooUrl();
    // Construct standard Odoo report URL with auth tokens
    const url = `${baseUrl}/report/pdf/amy_lights.action_report_lighting_quotation/${orderId}?token=${token}&db=${db}`;
    window.open(url, '_blank');
  },
  addQuickNote: async (resId, text, resModel = 'sale.order') => {
    const res = await api.post('/api/order/add_note', { params: { res_id: resId, text, res_model: resModel } });
    return res.data.result || { success: false, error: res.data.error };
  },
  addQuickActivity: async (resId, summary, note, deadline, userId, resModel = 'sale.order') => {
    const res = await api.post('/api/order/add_activity', { 
      params: { 
        res_id: resId, 
        summary, 
        note, 
        date_deadline: deadline, 
        user_id: userId,
        res_model: resModel
      } 
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  updateActivity: async (activityId, summary, note, deadline, userId) => {
    const res = await api.post('/api/order/update_activity', {
      params: { activity_id: activityId, summary, note, date_deadline: deadline, user_id: userId }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  deleteActivity: async (activityId) => {
    const res = await api.post('/api/order/delete_activity', {
      params: { activity_id: activityId }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  updateRemark: async (orderId, noteIndex, newText) => {
    const res = await api.post('/api/order/update_remark', {
      params: { order_id: orderId, note_index: noteIndex, new_text: newText }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  deleteRemark: async (orderId, noteIndex) => {
    const res = await api.post('/api/order/delete_remark', {
      params: { order_id: orderId, note_index: noteIndex }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  checkWhatsappStatus: async () => {
    const res = await api.get('/api/whatsapp/status');
    return res.data?.result?.data || res.data?.result || { success: false };
  },
  getWhatsappQr: async () => {
    const res = await api.get('/api/whatsapp/get_qr');
    return res.data?.result?.data || res.data?.result || { success: false };
  },
  disconnectWhatsapp: async () => {
    const res = await api.post('/api/whatsapp/disconnect');
    return res.data?.result?.data || res.data?.result || { success: false };
  },
  sendWhatsappPdf: async (resModel, resId, phone, message) => {
    const res = await api.post('/api/whatsapp/send_pdf', {
      params: { res_model: resModel, res_id: resId, phone: phone, message: message }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  deleteLead: async (leadId) => {
    const res = await api.post('/api/crm/delete_lead', {
      params: { lead_id: leadId }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  deleteOrder: async (orderId) => {
    const res = await api.post('/api/order/delete_order', {
      params: { order_id: orderId }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  updateRemark: async (remarkId, newText) => {
    const res = await api.post('/api/order/update_remark', {
      params: { remark_id: remarkId, new_text: newText }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
  deleteRemark: async (remarkId) => {
    const res = await api.post('/api/order/delete_remark', {
      params: { remark_id: remarkId }
    });
    return res.data.result || { success: false, error: res.data.error };
  },
};
