import React, { useState, useEffect, useMemo } from 'react';
import { odooService } from './services/odoo';
import SearchableSelect from './components/SearchableSelect';
import { 
  Plus, 
  X, 
  ChevronLeft,
  ChevronRight, 
  ArrowRight,
  ChevronDown,
  Activity, 
  Users, 
  Phone, 
  Paperclip, 
  CheckSquare,
  Send,
  FileText,
  ToggleRight,
  Sparkles,
  Wind,
  Lightbulb,
  Layers,
  MoreHorizontal,
  ShoppingBag,
  ShoppingCart,
  MapPin,
  Pencil,
  Trash,
  Calendar,
  User,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle,
  MoreVertical,
  Edit2,
  AlertCircle,
  Zap,
  GripVertical
} from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import './CreateOrder.css';

const createProductRow = () => ({
  id: Date.now(),
  productId: '',
  qty: 1,
  price: 0,
  discount: 0,
  remark: '',
  line_note: '',
  uom: 'Units'
});

// Simple in-memory cache for products/partners to speed up loading
const dataCache = {
  products: null,
  partners: null,
  architects: null,
  electricians: null
};

// Helper sub-component for product rows to handle drag controls independently
const ProductRow = ({ r, idx, rows, setRows, isMobile, isOrder, editId, masterData, productOptions, orderHeader, handleRowChange, addRow, onNavigate }) => {
  const dragControls = useDragControls();
  const selectedProduct = masterData.products.find(p => String(p.id) === String(r.productId)) || {
    id: r.productId,
    name: r.productName,
    beam: r.beam,
    image_url: r.image_url,
    description: r.description
  };

  return (
    <Reorder.Item 
      key={r.id} 
      value={r}
      dragListener={false}
      dragControls={dragControls}
      className={`product-item-card product-row ${r.display_type === 'line_section' ? 'is-section-row' : ''}`} 
      style={{ 
        position: 'relative',
        padding: isMobile ? '1.25rem 1rem' : '0.25rem 0.5rem', 
        border: isMobile ? '1px solid #e2e8f0' : 'none', 
        borderBottom: isMobile ? '1px solid #e2e8f0' : '1px solid #f1f5f9', 
        borderRadius: isMobile ? '12px' : 0,
        marginBottom: isMobile ? '0.75rem' : 0,
        backgroundColor: r.display_type === 'line_section' ? '#f8fafc' : '#fff',
        boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
        borderLeft: r.display_type === 'line_section' ? '4px solid #3b82f6' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <div 
        className="drag-handle" 
        onPointerDown={(e) => dragControls.start(e)}
        style={{ cursor: 'grab', color: '#cbd5e1', padding: '12px 6px', touchAction: 'none' }}
      >
        <GripVertical size={16} />
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        {isMobile && (
          <button 
            className="pi-remove" 
            onClick={() => {
              if (isOrder && editId) {
                handleRowChange(r.id, 'qty', 0);
              } else {
                setRows(prev => prev.filter(row => row.id !== r.id));
              }
            }} 
            style={{ 
              position: 'absolute', 
              top: '0.75rem', 
              right: '0.75rem',
              backgroundColor: '#fee2e2', 
              color: '#ef4444', 
              borderRadius: '6px', 
              padding: '6px',
              border: 'none',
              zIndex: 10
            }}
          >
            <Trash size={14} />
          </button>
        )}
        <div 
          className={isMobile ? "" : "pi-grid-row"} 
          style={{ 
            marginTop: 0, 
            display: isMobile ? 'flex' : 'grid', 
            gridTemplateColumns: r.display_type === 'line_section' 
              ? `1fr 40px` 
              : isMobile ? 'none' : `1.2fr 1fr 300px ${orderHeader.is_image ? '120px' : ''} ${orderHeader.is_beam ? '180px' : ''} 40px`.trim().replace(/\s+/g, ' '),
            alignItems: 'flex-start', 
            gap: isMobile ? '4px' : '8px', 
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            minHeight: '42px'
          }}
        >
           {r.display_type === 'line_section' ? (
             <div style={{ flex: 1, padding: '4px 8px' }}>
               <input 
                 type="text"
                 placeholder="Section Name (e.g. Living Room)"
                 value={r.productName}
                 onChange={(e) => handleRowChange(r.id, 'productName', e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && idx === rows.length - 1) {
                     e.preventDefault();
                     addRow();
                   }
                 }}
                 style={{ 
                   width: '100%', 
                   border: 'none', 
                   outline: 'none', 
                   fontSize: '14px', 
                   fontWeight: 800, 
                   color: '#1e293b',
                   backgroundColor: 'transparent',
                   padding: '4px 0'
                 }}
               />
             </div>
           ) : (
             <>
               <div className="pi-main-info" style={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <div className="pi-main-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                   <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: 0 }}>
                     {isMobile && <label className="pi-small-label">Product</label>}
                     <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                       <div style={{ flex: 1, minWidth: 0 }}>
                         <SearchableSelect
                           placeholder="Select Product"
                           options={productOptions}
                           value={r.productId}
                           defaultValue={r.productName}
                           onChange={(val) => handleRowChange(r.id, 'productId', val)}
                            onSelect={() => {
                              setTimeout(() => {
                                const input = document.getElementById(`qty-input-${r.id}`);
                                if (input) input.focus();
                              }, 50);
                            }}
                           small
                         />
                       </div>
                       <button 
                         onClick={() => onNavigate('create-product')}
                         style={{ flex: '0 0 24px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
                         title="Create New Product"
                       >
                         <Plus size={14} />
                       </button>
                     </div>
                   </div>
                 </div>
                 {orderHeader.is_desc && r.description && (
                   <div className="pi-desc-box" style={{ padding: '0 4px 4px', fontSize: '11px', color: '#64748b', whiteSpace: 'pre-wrap', fontStyle: 'italic', lineHeight: '1.4' }}>
                     {r.description}
                   </div>
                 )}
               </div>
               
               <div className="pi-note-col" style={{ display: 'block', width: '100%' }}>
                 {isMobile && <label className="pi-small-label">Note</label>}
                 <textarea 
                   className="co-textarea"
                   placeholder="Add line note..."
                   value={r.line_note || ''}
                   onChange={(e) => handleRowChange(r.id, 'line_note', e.target.value)}
                   style={{ 
                     width: '100%', 
                     minHeight: isMobile ? '40px' : '32px', 
                     height: isMobile ? 'auto' : '32px',
                     fontSize: '11px', 
                     padding: '6px', 
                     border: '1px solid #e2e8f0',
                     borderRadius: '4px',
                     background: '#fff',
                     resize: 'vertical'
                   }}
                 />
               </div>
               <div className="pi-sub-grid" style={{ width: '100%', minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMobile ? '0.5rem' : '4px', marginTop: isMobile ? '0.5rem' : '0' }}>
                 <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                  {isMobile && <label className="pi-small-label">Qty</label>}
                   <input 
                     id={`qty-input-${r.id}`}
                     type="number" 
                     className="co-input-border" 
                     value={r.qty} 
                     onFocus={(e) => e.target.select()} 
                     onChange={(e) => handleRowChange(r.id, 'qty', e.target.value)} 
                     style={{ width: '100%', height: '32px', fontSize: '13px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: 0 }} 
                   />
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                  {isMobile && <label className="pi-small-label">Disc%</label>}
                  <input 
                     type="number" 
                     className="co-input-border" 
                     value={r.discount} 
                     onFocus={(e) => e.target.select()} 
                     onChange={(e) => handleRowChange(r.id, 'discount', e.target.value)} 
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && idx === rows.length - 1) {
                         e.preventDefault();
                         addRow();
                       }
                     }}
                     style={{ width: '100%', height: '32px', fontSize: '13px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: 0 }} 
                   />
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                  {isMobile && <label className="pi-small-label">Price</label>}
                  <input 
                     type="number" 
                     className="co-input-border" 
                     value={r.price} 
                     onFocus={(e) => e.target.select()} 
                     onChange={(e) => handleRowChange(r.id, 'price', e.target.value)} 
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && idx === rows.length - 1) {
                         e.preventDefault();
                         addRow();
                       }
                     }}
                     style={{ width: '100%', height: '32px', fontSize: '13px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: 0 }} 
                   />
                </div>
              </div>

               <div style={{ 
                 display: orderHeader.is_image ? 'flex' : 'none', 
                 justifyContent: 'center',
                 minWidth: 0,
                 overflow: 'hidden',
                 marginTop: isMobile ? '8px' : '0'
               }}>
                 <div className="h-[70px] w-full bg-slate-50 border border-slate-100 rounded overflow-hidden relative">
                   {selectedProduct?.id && (
                     <img 
                       src={(() => {
                         const token = localStorage.getItem('odoo_session_id') || '';
                         const db = import.meta.env.VITE_ODOO_DB || 'stage';
                         let path = selectedProduct.image_url;
                         if (!path) path = `/web/image/product.template/${selectedProduct.id}/image_256`;
                         return `${path}${path.includes('?') ? '&' : '?'}token=${token}&db=${db}`;
                       })()} 
                       alt="p" className="h-full w-full object-contain"
                       onError={(e) => { e.target.style.display='none'; }}
                     />
                   )}
                 </div>
               </div>

                <div style={{ 
                  display: orderHeader.is_beam ? 'block' : 'none', 
                  paddingTop: isMobile ? '0' : '4px' 
                }}>
                  <input 
                    type="text" 
                    className="co-input-border"
                    value={r.beam || '-'} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleRowChange(r.id, 'beam', e.target.value)}
                    style={{ 
                      width: '100%', 
                      height: '32px', 
                      fontSize: '11px', 
                      textAlign: 'center', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '4px',
                      backgroundColor: '#fff' 
                    }}
                  />
                </div>
             </>
           )}

           {!isMobile && (
             <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button 
                  className="pi-remove-row" 
                  onClick={() => {
                    if (isOrder && editId) {
                      handleRowChange(r.id, 'qty', 0);
                    } else {
                      setRows(prev => prev.filter(row => row.id !== r.id));
                    }
                  }}
                  style={{ width: '40px', height: '32px', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Delete Row"
                >
                  <Trash size={15} />
                </button>
              </div>
           )}
        </div>
      </div>
    </Reorder.Item>
  );
};

// ... existing code ...
const CreateOrder = ({ editId, onNavigate, isSelection, isOrder, extraData, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({
    partners: [],
    products: [],
    users: [],
    activity_types: [],
    architects: [],
    electricians: []
  });

  const [orderHeader, setOrderHeader] = useState(() => {
    if (extraData?.formState?.orderHeader) return extraData.formState.orderHeader;
    
    // Check localStorage for a saved draft
    if (!editId) {
      const savedDraft = localStorage.getItem('amy_order_draft_header');
      if (savedDraft) {
        try { return JSON.parse(savedDraft); } catch (e) { console.error("Failed to parse Order Header draft", e); }
      }
    }

    return {
      partnerId: extraData?.partner_id || '',
      date: new Date().toISOString().split('T')[0],
      remark: '',
      architectId: '',
      electricianId: '',
      is_desc: false,
      is_image: false,
      is_beam: false,
      is_automate: false,
      opportunity_id: ''
    };
  });

   const [showProducts, setShowProducts] = useState(true);
   const [showNotes, setShowNotes] = useState(false);
   const [expandedCategoryIds, setExpandedCategoryIds] = useState({});
   const [showCategories, setShowCategories] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEditText, setTaskEditText] = useState({});
  const [noteEditText, setNoteEditText] = useState("");
  const [editingActivityNoteId, setEditingActivityNoteId] = useState(null);
  const [activityNoteEditText, setActivityNoteNoteEditText] = useState("");

  const [rows, setRows] = useState(() => {
    if (extraData?.formState?.rows) return extraData.formState.rows;
    
    // Check localStorage for a saved draft
    if (!editId) {
      const savedDraft = localStorage.getItem('amy_order_draft_rows');
      if (savedDraft) {
        try { return JSON.parse(savedDraft); } catch (e) { console.error("Failed to parse Order Rows draft", e); }
      }
    }

    return [createProductRow()];
  });

  const [generalNotes, setGeneralNotes] = useState(() => {
    if (extraData?.formState?.generalNotes) return extraData.formState.generalNotes;
    
    if (!editId) {
      const savedDraft = localStorage.getItem('amy_order_draft_notes');
      if (savedDraft) {
        try { return JSON.parse(savedDraft); } catch (e) { console.error("Failed to parse Order Notes draft", e); }
      }
    }
    return [];
  });
  const [generalNoteInput, setGeneralNoteInput] = useState('');
  const [deletedActivityIds, setDeletedActivityIds] = useState([]);

  // Modal & Form States (Restored to fix lint errors)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ 
    name: '', billing_name: '', contact_person: '', phone: '', 
    billing_address: '', delivery_address: '', electrician: '', 
    electrician_number: '', architect: '', architect_number: '', 
    office_contact_person: '' 
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', product_code: '', unit: '', price: 0, note: '' 
  });

  const safeNavigate = (to) => {
    onNavigate(to);
  };

  const [activityInputs, setActivityInputs] = useState({});
  const [activityHistory, setActivityHistory] = useState(() => {
    if (extraData?.formState?.activityHistory) return extraData.formState.activityHistory;
    return {
      call: [],
      whatsapp: [],
      visit: [],
      email: []
    };
  });

  const partnerOptions = useMemo(() => {
    return Array.from(new Map((masterData.partners || []).filter(p => p && p.id).map(p => [String(p.name).toLowerCase().trim(), p])).values()).map((p) => ({ value: p.id, label: p.name }));
  }, [masterData.partners]);

  const productOptions = useMemo(() => {
    return (masterData.products || [])
      .filter(p => orderHeader.is_automate ? true : !p.is_automation)
      .map(p => ({ value: p.id, label: p.name }));
  }, [masterData.products, orderHeader.is_automate]);

  const userOptions = useMemo(() => {
    return (masterData.users || []).map(u => ({ value: u.id, label: u.name }));
  }, [masterData.users]);

  // Handle auto-saving to localStorage
  useEffect(() => {
    if (!editId) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('amy_order_draft_header', JSON.stringify(orderHeader));
        localStorage.setItem('amy_order_draft_rows', JSON.stringify(rows));
        localStorage.setItem('amy_order_draft_notes', JSON.stringify(generalNotes));
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [orderHeader, rows, generalNotes, editId]);

  const clearDraft = () => {
    localStorage.removeItem('amy_order_draft_header');
    localStorage.removeItem('amy_order_draft_rows');
    localStorage.removeItem('amy_order_draft_notes');
  };
  // --- HELPER FUNCTIONS (Moved up to avoid "before initialization" errors) ---

  const fetchMasterData = React.useCallback(async () => {
    // If cache exists, use it immediately for responsiveness
    if (dataCache.products) {
      setMasterData(prev => ({ ...prev, ...dataCache }));
    }

    try {
      // Parallelize fetching
      const [masterRes, productRes, partnerRes] = await Promise.all([
        odooService.getMasterData().catch(() => null),
        odooService.getProducts(5000).catch(() => null), // Optimized limit for search coverage
        odooService.getPartners().catch(() => null)
      ]);

      const newData = { ...masterData };

      if (masterRes) {
        // Only assign if they have data, to avoid wiping out the dedicated high-limit fetches
        if (masterRes.products && masterRes.products.length > 0) newData.products = masterRes.products;
        if (masterRes.partners && masterRes.partners.length > 0) newData.partners = masterRes.partners;
        if (masterRes.architects && masterRes.architects.length > 0) newData.architects = masterRes.architects;
        if (masterRes.electricians && masterRes.electricians.length > 0) newData.electricians = masterRes.electricians;
        
        // Merge everything else (including amy_note_types) without wiping objects
        Object.assign(newData, masterRes);
      }

      // Merge products from dedicated call
      if (Array.isArray(productRes)) {
        newData.products = productRes;
      } else if (productRes && productRes.products) {
        newData.products = productRes.products;
      }

      // Merge partners from dedicated call
      if (Array.isArray(partnerRes)) {
        newData.partners = partnerRes;
      } else if (partnerRes && partnerRes.partners) {
        newData.partners = partnerRes.partners;
      }

      // Update cache and state
      // Update cache and state without wiping newly injected edit items
      if (newData.products.length > 0 || newData.partners.length > 0 || masterRes) {
        setMasterData(prev => {
          // Merge arrays securely using Map to preserve existing UI items (specifically injected by edit flow)
          const mergeArrays = (arr1, arr2) => {
             const map = new Map();
             (arr1 || []).forEach(item => map.set(item.id, item));
             (arr2 || []).forEach(item => map.set(item.id, item));
             return Array.from(map.values());
          };

          const result = {
            ...prev,
            ...newData,
            products: mergeArrays(prev.products, newData.products),
            partners: mergeArrays(prev.partners, newData.partners)
          };
          
          Object.assign(dataCache, result);
          return result;
        });
      }
    } catch (err) {
      console.error('Fetch master data failed', err);
    }
  }, []);

  const fetchEditOrder = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await odooService.getOrderDetail(editId);
      if (data) {
        if (data.state === 'sale' || data.status === 'sale') {
           alert("This order is confirmed and can no longer be edited.");
           return;
        }
        
        setDebugRawData(data);

        const extractId = (val) => {
          if (val === null || val === undefined || val === false) return '';
          if (Array.isArray(val)) return val.length > 0 ? val[0] : '';
          if (typeof val === 'object') {
             return val.id || val.value || val.product_id || val.partner_id || '';
          }
          return val;
        };

        const extractName = (val) => {
          if (Array.isArray(val) && val.length > 1) return val[1];
          if (typeof val === 'object' && val !== null) return val.name || val.display_name || '';
          return '';
        };

        const missingPartners = [];
        const missingProducts = [];

        // Support multiple possible keys for partner
        // Multi-layered partner extraction to prevent mandatory field failure
        let pId = extractId(data.partner_id) || extractId(data.customer_id) || extractId(data.partner) || data.id_partner;
        let pName = extractName(data.partner_id || data.customer_id) || data.partner_name || data.display_name || 'Selected Customer';
        
        console.log(`[Edit Flow] Extracted Partner ID: ${pId}, Name: ${pName}`);

        if (!pId && data.partner_name) {
          const cachedPartner = dataCache.partners?.find(p => p.name === data.partner_name);
          pId = cachedPartner ? cachedPartner.id : `_GHOST_PARTNER-${data.partner_name}`;
          pName = data.partner_name;
        }
        
        if (pId) {
          const detail = { 
            id: pId, 
            name: pName,
            street: data.street || '',
            street2: data.street2 || '',
            city: data.city || '',
            zip: data.zip || '',
            state_id: data.state_id || false,
            phone: data.partner_phone || data.phone || '',
            vat: data.partner_vat || data.vat || '',
            architect_name: extractName(data.architect_id),
            architect_phone: data.architect_phone || '',
            electrician_name: extractName(data.electrician_id),
            electrician_phone: data.electrician_phone || ''
          };

          const exists = masterData.partners.find(p => String(p.id) === String(pId));
          if (!exists) {
             missingPartners.push(detail);
          } else {
             // Enrich existing data with order-level fields if missing
             Object.assign(exists, {
                phone: exists.phone || detail.phone,
                vat: exists.vat || detail.vat,
                street: exists.street || detail.street,
                street2: exists.street2 || detail.street2,
                city: exists.city || detail.city,
                zip: exists.zip || detail.zip,
                architect_name: exists.architect_name || detail.architect_name,
                architect_phone: exists.architect_phone || detail.architect_phone,
                electrician_name: exists.electrician_name || detail.electrician_name,
                electrician_phone: exists.electrician_phone || detail.electrician_phone
             });
          }
        }

        setOrderHeader({
          partnerId: pId || '',
          partnerName: pName || '', // Persistent fallback name
          date: data.date_order ? data.date_order.split(' ')[0] : new Date().toISOString().split('T')[0],
          architectId: extractId(data.architect_id) || extractId(data.architect) || '',
          electricianId: extractId(data.electrician_id) || extractId(data.electrician) || '',
          remark: data.remark || '',
          is_desc: data.is_desc ?? true,
          is_image: data.is_image ?? true,
          is_beam: data.is_beam ?? true,
          is_automate: data.is_automate ?? false,
          amount_total: data.amount_total || 0,
          currency_symbol: data.currency_symbol || '$'
        });
        
        // Populate existing notes if they are returned by Odoo
        const noteData = data.amy_notes || data.amy_note_lines;
        if (noteData && Array.isArray(noteData)) {
          const mappedHistory = {};
          const sessionId = localStorage.getItem('odoo_session_id') || '';
          const dbName = import.meta.env.VITE_ODOO_DB || 'stage';

          // 1. Process standard remarks first to build a master list of seen texts
          const seenTexts = new Set();
          const remarkItems = [];
          if (data.remark) {
            const cleanRemark = data.remark.replace(/<\/?[^>]+(>|$)/g, "\n").trim();
            if (cleanRemark) {
              const individualNotes = cleanRemark.split(/\n|<br\s*\/?>|\|/i)
                .map(t => t.trim())
                .filter(t => t.length > 0);
              
              individualNotes.forEach((text, idx) => {
                const tLower = text.toLowerCase();
                if (!seenTexts.has(tLower)) {
                  seenTexts.add(tLower);
                  remarkItems.push({
                    id: `imported-remark-${idx}`,
                    text: text,
                    by: 'System',
                    date: 'Imported',
                    is_from_backend: true,
                    is_new: false
                  });
                }
              });
            }
          }

          // 2. Process amy.note records
          const allTypeNotes = [];
          noteData.forEach(note => {
            // EXACT match first, then plural-strip fallback
            const rawType = String(note.note_type || '').trim();
            let resolvedType = null;
            if (rawType) {
              const v = rawType.toLowerCase();
              resolvedType = masterData.amy_note_types?.find(t => String(t.id).toLowerCase() === v);
              if (!resolvedType) {
                resolvedType = masterData.amy_note_types?.find(t => {
                  const tid = String(t.id).toLowerCase();
                  return tid === v.replace(/s$/, '') || v === tid.replace(/s$/, '');
                });
              }
            }
            const type = resolvedType ? resolvedType.id : (rawType.toLowerCase() || 'others');
            const noteText = (note.text || '').replace(/<[^>]*>?/gm, '').trim();
            const tLower = noteText.toLowerCase();

            // Only deduplicate against remarks for truly general notes (no category)
            if (!rawType && seenTexts.has(tLower)) return;
            if (noteText) seenTexts.add(tLower);
            
            const noteImages = (note.images || note.image || []).map(url => {
              if (typeof url !== 'string') return null;
              const hasToken = url.includes('token=') || url.includes('session_id=');
              if (hasToken) return url;
              const connector = url.includes('?') ? '&' : '?';
              return `${url}${connector}token=${sessionId}&db=${dbName}`;
            }).filter(Boolean);

            const processedNote = {
              id: note.id || Math.random(),
              text: noteText,
              images: noteImages,
              by: note.author || 'System',
              date: note.create_date || '',
              note_type_id: type,
              is_from_backend: true,
              is_new: false
            };
            
            // Notes with a valid backend note_type ALWAYS stay in their category bucket
            if (rawType) {
              if (!mappedHistory[type]) mappedHistory[type] = [];
              mappedHistory[type].push(processedNote);
            } else {
              // Only truly un-typed notes go to generalNotes
              allTypeNotes.push(processedNote);
            }
          });
          
          setGeneralNotes([...allTypeNotes, ...remarkItems]);
          setActivityHistory(mappedHistory);
          // Auto-expand categories if we have history
          if (Object.keys(mappedHistory).length > 0) {
            setShowCategories(true);
            const initialExpanded = {};
            Object.keys(mappedHistory).forEach(key => initialExpanded[key] = true);
            setExpandedCategoryIds(initialExpanded);
          }
        }
        
        if (data.activities && Array.isArray(data.activities)) {
          setScheduledActivities(data.activities);
        }
        
        const lineItems = data.lines || data.order_line || [];
        // Support all line types (products, sections, notes)
        const mappedRows = lineItems.map((l, i) => {
          let prodId = extractId(l.product_id) || extractId(l.product);
          const searchName = l.product_name || l.name || extractName(l.product_id);
          
          if (!prodId) {
            // Check cache or master data by name/code
            const cachedProduct = dataCache.products?.find(p => p.name === searchName || p.default_code === l.product_code)
                               || masterData.products.find(p => p.name === searchName || p.default_code === l.product_code);
            prodId = cachedProduct ? cachedProduct.id : (searchName ? `_GHOST_PRODUCT-${searchName}` : '');
          }

          if (prodId) {
            const exists = masterData.products.find(p => String(p.id) === String(prodId));
            if (!exists) {
               missingProducts.push({ 
                 id: prodId, 
                 name: searchName || 'Selected Product',
                 image_url: l.image_url || '',
                 description: l.description || l.remark || '',
                 beam: l.beam || '-'
               });
            }
          }

          return {
            id: l.id || `edit-${Date.now()}-${i}`,
            productId: prodId || '',
            productName: searchName || '', // Persistent fallback name
            qty: l.product_uom_qty || l.qty || l.product_qty || 1,
            price: l.price_unit ?? l.price ?? 0,
            discount: l.discount || 0,
            remark: l.remark || l.name || '',
            line_note: l.line_note || '',
            display_type: l.display_type || false,
            description: l.description || l.remark || ''
          };
        });

        if (missingPartners.length > 0 || missingProducts.length > 0) {
          setMasterData(prev => {
            const partnerMap = new Map();
            [...prev.partners, ...missingPartners].forEach(p => partnerMap.set(p.id, p));
            
            const productMap = new Map();
            [...prev.products, ...missingProducts].forEach(p => productMap.set(p.id, p));

            return {
              ...prev,
              partners: Array.from(partnerMap.values()),
              products: Array.from(productMap.values())
            };
          });
        }

        // Set rows AFTER masterData update (ideally) but React batches these anyway
        setRows(mappedRows.length ? mappedRows : [createProductRow()]);
        setShowProducts(mappedRows.length > 0);

         // --- NEW: Sync Notes and Activities from Backend ---
          // 1. Sync General Notes (Remark field)
           if (data.remarks && Array.isArray(data.remarks)) {
              const uniqueRemarks = [];
              const seenTexts = new Set();
              data.remarks.forEach(r => {
                 const cleanText = (r.remark || '').replace(/<[^>]*>?/gm, '').trim();
                 if (!seenTexts.has(cleanText.toLowerCase()) && cleanText) {
                    seenTexts.add(cleanText.toLowerCase());
                    uniqueRemarks.push({
                      id: r.id,
                      text: cleanText,
                      date: r.date,
                      by: r.salesperson,
                      is_new: false,
                      is_structured: true
                    });
                 }
              });
              setGeneralNotes(uniqueRemarks);
              setShowNotes(true);
          } else if (data.remark || data.note) {
             // Fallback for old orders without structured remarks
             const remark = data.remark || data.note || '';
             const parts = remark.split(/\n---\n|<br\s*\/?>/).filter(Boolean);
             setGeneralNotes(parts.map(t => {
                const authorMatch = t.match(/<b>(.*?)<\/b>/) || t.match(/^\[(.*?) - .*?\]/);
                const authorName = authorMatch ? authorMatch[1] : 'Odoo';
                let cleanText = t.replace(/<[^>]*>?/gm, '').trim();
                
                if (authorName !== 'Odoo') {
                   cleanText = cleanText.replace(new RegExp(`^${authorName}:\\s*`, 'i'), '');
                   cleanText = cleanText.replace(new RegExp(`^\\[${authorName}.*?\\].*?(\\n|$)`, 'i'), '');
                }
                
                return {
                  id: `hist-${Math.random()}`,
                  text: cleanText.trim(),
                  date: data.date_order || '',
                  by: authorName,
                  is_new: false
                };
             }));
             setShowNotes(true);
          }
 
          // 3. Sync Scheduled Activities (Tasks)
          if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
             setShowActivitySection(true);
             const uniqueActs = [];
             const seenActTexts = new Set();
             data.activities.forEach(act => {
                const cleanNote = (act.note || '').replace(/<[^>]*>?/gm, '').trim();
                const key = `${act.summary}-${cleanNote}-${act.date_deadline}`.toLowerCase();
                if (!seenActTexts.has(key)) {
                   seenActTexts.add(key);
                   uniqueActs.push({
                     id: act.id,
                     activity_type_id: act.activity_type_id,
                     summary: act.summary || act.activity_type_name || 'Activity',
                     note: cleanNote,
                     user_id: act.user_id,
                     date_deadline: act.date_deadline || ''
                   });
                }
             });
             setScheduledActivities(uniqueActs);
          }
      }
    } catch (err) {
      console.error('Edit fetch failed', err);
    }
    finally { setLoading(false); }
  }, [editId]); // Removed masterData dependencies to prevent infinite reload loop

  useEffect(() => {
    if (extraData) {
      const { preFilledPartnerId, preFilledProducts, partner_id, lead, targetState } = extraData;
      const targetPartnerId = preFilledPartnerId || partner_id || (lead?.partner_id ? (Array.isArray(lead.partner_id) ? lead.partner_id[0] : lead.partner_id) : null);
      
      if (lead) {
        // Deep pre-fill from Lead object
        setOrderHeader(prev => ({
          ...prev,
          partnerId: targetPartnerId || '',
          architectId: lead.architect_id ? (Array.isArray(lead.architect_id) ? lead.architect_id[0] : lead.architect_id) : '',
          electricianId: lead.electrician_id ? (Array.isArray(lead.electrician_id) ? lead.electrician_id[0] : lead.electrician_id) : '',
          remark: lead.description || lead.partner_remark || '',
          state: targetState || 'draft',
          opportunity_id: lead.id
        }));
        // Also ensure categories/products section is visible if we want
        setShowProducts(true);
      } else if (extraData.preFilledPartner) {
        const p = extraData.preFilledPartner;
        setOrderHeader(prev => ({ 
          ...prev, 
          partnerId: p.id,
          partnerName: p.name,
          architectId: p.architect_id || p.architect || '',
          electricianId: p.electrician_id || p.electrician || ''
        }));
      } else if (targetPartnerId) {
        // Ensure master data is refreshed so the new partner appears in the dropdown list
        fetchMasterData().then(() => {
           // We explicitly update orderHeader with the ID. 
           // The dropdown Options will now include the new partner from fetchMasterData.
           setOrderHeader(prev => ({ ...prev, partnerId: targetPartnerId }));
           
           // Fetch full partner details to auto-fill address etc.
           odooService.getPartnerDetail(targetPartnerId).then(res => {
             if (res) {
               setOrderHeader(prev => ({
                 ...prev,
                 partnerName: res.name || prev.partnerName,
                 architectId: (res.architect_id && Array.isArray(res.architect_id)) ? res.architect_id[0] : (res.architect_id || prev.architectId),
                 electricianId: (res.electrician_id && Array.isArray(res.electrician_id)) ? res.electrician_id[0] : (res.electrician_id || prev.electricianId)
               }));
             }
           });
        });
      }
      
      if (preFilledProducts && preFilledProducts.length > 0) {
        setRows(preFilledProducts.map(p => ({
          id: Date.now() + Math.random(),
          productId: p.productId,
          productName: p.name || '',
          description: p.description || p.description_sale || '',
          beam: p.beam || '-',
          image_url: p.image_url || '',
          qty: p.qty || 1,
          price: p.price || 0,
          remark: '',
          uom: 'Units',
        })));
        setShowProducts(true);
      }
    }
  }, [extraData, fetchMasterData]);
  
  // Unsaved changes prompt has been removed

  const [debugRawData, setDebugRawData] = useState(null);
  const [dragActiveId, setDragActiveId] = useState(null);

  const [scheduledActivities, setScheduledActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    activity_type_id: '',
    summary: 'Task',
    note: '',
    user_id: '',
    date_deadline: new Date().toISOString().split('T')[0]
  });
  const [showActivitySection, setShowActivitySection] = useState(false);

  const handleAddGeneralNote = async () => {
    if (!generalNoteInput.trim()) return;
    
    if (editId) {
      try {
        await odooService.addQuickNote(editId, generalNoteInput, 'sale.order');
        const res = await odooService.getOrderDetail(editId);
        if (res && res.remarks) {
          setGeneralNotes(res.remarks.map(r => ({
            id: r.id,
            text: r.remark,
            date: r.date,
            by: r.salesperson,
            is_new: false,
            is_structured: true
          })));
        }
        setGeneralNoteInput("");
        return;
      } catch (err) {
        console.error("Failed to add structured remark", err);
      }
    }

    // Fallback for new orders
    const newNote = {
      id: `new-${Date.now()}`,
      text: generalNoteInput,
      by: localStorage.getItem('user_name') || 'You',
      date: 'Just now',
      is_new: true,
      images: []
    };
    setGeneralNotes(prev => [...prev, newNote]);
    setGeneralNoteInput("");
  };

  const handleEditNote = (id, currentText) => {
    setEditingNoteId(id);
    setNoteEditText(currentText);
  };

  const saveEditNote = async (id) => {
    const note = generalNotes.find(n => n.id === id);
    if (note && note.is_structured && editId) {
      try {
        await odooService.updateRemark(id, noteEditText);
        const res = await odooService.getOrderDetail(editId);
        if (res && res.remarks) {
          setGeneralNotes(res.remarks.map(r => ({
            id: r.id,
            text: r.remark,
            date: r.date,
            by: r.salesperson,
            is_new: false,
            is_structured: true
          })));
        }
        setEditingNoteId(null);
        return;
      } catch (err) {
        alert("Failed to update remark");
      }
    }
    
    if (!noteEditText.trim()) return alert("Remark is required");
    setGeneralNotes(prev => prev.map(n => n.id === id ? { ...n, text: noteEditText } : n));
    setEditingNoteId(null);
    setNoteEditText("");
  };

  const handleDeleteNote = async (id) => {
    const note = generalNotes.find(n => n.id === id);
    if (note && note.is_structured && editId) {
      if (!window.confirm("Delete this remark?")) return;
      try {
        await odooService.deleteRemark(id);
        const res = await odooService.getOrderDetail(editId);
        if (res && res.remarks) {
          setGeneralNotes(res.remarks.map(r => ({
            id: r.id,
            text: r.remark,
            date: r.date,
            by: r.salesperson,
            is_new: false,
            is_structured: true
          })));
        }
        return;
      } catch (err) {
        alert("Failed to delete remark");
      }
    }
    setGeneralNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleImageUpload = async (id, files) => {
    const fileArray = Array.from(files);
    const base64Promises = fileArray.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension to compress payload (prevents 413 Payload Too Large)
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Downsample beautifully to JPEG 60% quality
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => reject('Image load error');
      };
      reader.onerror = reject;
    }));

    try {
      const base64Images = await Promise.all(base64Promises);
      setActivityInputs(prev => {
        const current = prev[id] || { text: '', images: [] };
        return {
          ...prev,
          [id]: { ...current, images: [...current.images, ...base64Images] }
        };
      });
    } catch (err) {
      console.error("Image upload failed", err);
    }
  };

  const handleNotePaste = async (e, id) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleImageUpload(id, imageFiles);
    }
  };

  const handleRemoveImageInput = (actId, imgIdx) => {
    setActivityInputs(prev => {
      const current = prev[actId];
      if (!current) return prev;
      return {
        ...prev,
        [actId]: { ...current, images: current.images.filter((_, i) => i !== imgIdx) }
      };
    });
  };

  const handleAddActivityNote = (id) => {
    const input = activityInputs[id] || { text: '', images: [] };
    if (!input.text.trim()) return alert("Please enter note message");
    
    const newNote = {
      id: `local-${Date.now()}`,  // String prefix so it's never confused with a real Odoo numeric ID
      text: input.text,
      images: input.images,
      by: localStorage.getItem('user_name') || 'You',
      date: new Date().toLocaleString(),
      is_new: true  // Flag: this note was created in this session, needs CREATE command
    };
    
    setActivityHistory(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), newNote]
    }));
    setActivityInputs(prev => ({ ...prev, [id]: { text: '', images: [] } }));
  };
  
  const handleEditActivityNote = (catId, noteId, text) => {
    setEditingActivityNoteId(noteId);
    setActivityNoteNoteEditText(text);
  };

  const handleSaveActivityNote = (catId, noteId) => {
    if (!activityNoteEditText.trim()) return alert("Note message is required");
    setActivityHistory(prev => ({
      ...prev,
      [catId]: prev[catId].map(n => n.id === noteId ? { ...n, text: activityNoteEditText } : n)
    }));
    setEditingActivityNoteId(null);
  };

  const handleDeleteActivityNote = (catId, noteId) => {
    // Collect ID only if it was already saved in Odoo (numeric ID)
    if (typeof noteId === 'number') {
      setDeletedActivityIds(prev => [...prev, noteId]);
    }
    setActivityHistory(prev => ({
      ...prev,
      [catId]: prev[catId].filter(n => n.id !== noteId)
    }));
  };
  const [isMobile, setIsMobile] = React.useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  ));

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    fetchMasterData();
    if (editId && !extraData?.formState) fetchEditOrder();
    // Only triggering on editId mount/change to prevent recursive reloads
  }, [editId, extraData?.formState]); 

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        if (field === 'productId') {
          const parsedId = /^\d+$/.test(value) ? parseInt(value) : value;
          const prod = masterData.products.find(p => String(p.id) === String(parsedId));
          const baseDesc = prod ? (prod.description || prod.description_sale || '') : '';
          const baseBeam = prod ? (prod.beam || '-') : '-';
          return { 
            ...r, 
            productId: value, 
            productName: prod ? prod.name : r.productName,
            price: prod ? prod.price : 0,
            beam: baseBeam,
            description: updateDescriptionWithBeam(baseDesc, baseBeam)
          };
        }
        if (field === 'beam') {
          // Update beam and also sync description
          const newDesc = updateDescriptionWithBeam(r.description, value);
          return { ...r, beam: value, description: newDesc };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const updateDescriptionWithBeam = (desc, newBeam) => {
    if (!desc) return `Beam: ${newBeam}`;
    const regex = /(Beam(\s*Angle)?\s*:\s*)([^|\n]+)/i;
    if (regex.test(desc)) {
      return desc.replace(regex, `$1${newBeam}`);
    }
    // Only append if it's not a generic dash and there's actually a value
    if (newBeam && newBeam !== '-') {
      return `${desc}\nBeam: ${newBeam}`;
    }
    return desc;
  };

  const selectedPartner = useMemo(() => masterData.partners.find(p => String(p.id) === String(orderHeader.partnerId)), [masterData.partners, orderHeader.partnerId]);
  const selectedArchitect = useMemo(() => {
    const id = String(orderHeader.architectId);
    return (masterData.architects || []).find(a => String(a.id) === id) || (masterData.partners || []).find(p => String(p.id) === id);
  }, [masterData.architects, masterData.partners, orderHeader.architectId]);

  const selectedElectrician = useMemo(() => {
    const id = String(orderHeader.electricianId);
    return (masterData.electricians || []).find(e => String(e.id) === id) || (masterData.partners || []).find(p => String(p.id) === id);
  }, [masterData.electricians, masterData.partners, orderHeader.electricianId]);

  const total = useMemo(() => {
    return rows.reduce((sum, row) => sum + ((parseFloat(row.price) || 0) * (parseFloat(row.qty) || 0) * (1 - (parseFloat(row.discount) || 0) / 100)), 0);
  }, [rows]);

  const addRow = () => {
    const newId = Date.now();
    setRows(prev => [...prev, { 
      id: newId, 
      productId: '', 
      productName: '', 
      qty: 1, 
      price: 0, 
      discount: 0,
      remark: '', 
      line_note: '',
      beam: '-',
      description: '',
      image_url: '',
      uom: 'Units'
    }]);
    
    // TAB Focus logic: Focus and OPEN the new product select after it renders
    setTimeout(() => {
      const rows = document.querySelectorAll('.product-row');
      const lastRow = rows[rows.length - 1];
      const select = lastRow?.querySelector('.ss-control');
      if (select) {
        select.focus();
        select.click(); // Open the dropdown immediately
      }
    }, 50);
  };

  const addSection = () => {
    const newId = Date.now();
    setRows(prev => [...prev, { 
      id: newId, 
      display_type: 'line_section', 
      productName: '', 
      qty: 0, 
      price: 0, 
      discount: 0, 
      remark: 'Section Name' 
    }]);

    setTimeout(() => {
      const rows = document.querySelectorAll('.product-row');
      const lastRow = rows[rows.length - 1];
      const input = lastRow?.querySelector('input[type="text"]');
      if (input) input.focus();
    }, 50);
  };



  const handleSaveCustomer = async () => {
    if (!newCustomer.name) return alert("Party Name is required");
    try {
      // Mapping to Odoo (Simplified check)
      const res = await odooService.createPartner({
         name: newCustomer.name,
         phone: newCustomer.phone,
         email: '', // Not in form
         comment: newCustomer.billing_address // Simplified
      });
      if (res) {
        setMasterData(prev => ({ ...prev, partners: [...prev.partners, res] }));
        setOrderHeader(prev => ({ ...prev, partnerId: res.id }));
        setShowCustomerModal(false);
        setNewCustomer({ name: '', billing_name: '', contact_person: '', phone: '', billing_address: '', delivery_address: '', electrician: '', electrician_number: '', architect: '', architect_number: '', office_contact_person: '' });
      }
    } catch {
      alert("Customer creation failed");
    }
  };

  const handleSaveProduct = async () => {
     if (!newProduct.name) return alert("Name is required");
     try {
        const res = await odooService.createProduct({
          name: newProduct.name,
          default_code: newProduct.product_code,
          list_price: newProduct.price
        });
        if (res) {
          setMasterData(prev => ({ ...prev, products: [...prev.products, res] }));
          setShowProductModal(false);
          setNewProduct({ name: '', product_code: '', unit: '', price: 0, note: '' });
        }
     } catch {
       alert("Product creation failed");
     }
  };

  const handleProcess = async (e, targetState = null) => {

    const resolveGhostId = (ghostId, type) => {
      if (!ghostId) return null;
      const ghostStr = String(ghostId);
      
      // If it's already a numeric string, return it
      if (/^\d+$/.test(ghostStr)) return ghostStr;

      if (ghostStr.startsWith(`_GHOST_${type.toUpperCase()}-`)) {
        const trueName = ghostStr.replace(`_GHOST_${type.toUpperCase()}-`, '');
        const list = type === 'partner' ? masterData.partners : masterData.products;
        // Try to find by name - this time looking for a REAL numeric ID
        const real = list.find(item => item.name === trueName && !String(item.id).startsWith('_GHOST_'));
        return real ? real.id : ghostId;
      }
      return ghostId;
    };

    const finalPartnerId = resolveGhostId(orderHeader.partnerId, 'partner');
    if (!editId && (!finalPartnerId || isNaN(parseInt(finalPartnerId)))) {
        return alert("Please select a valid customer before proceeding.");
    }

    const productLines = rows.filter(r => r.display_type === 'line_section' || (r.productId !== '' && r.productId !== null && r.productId !== undefined));
    if (productLines.length === 0 && !isSelection) {
        return alert("Please select at least one product before saving.");
    }

    setLoading(true);
    try {
      const finalProductLines = productLines.map((r, idx) => {
        const isExisting = typeof r.id === 'number' && String(r.id).length < 12;
        const cmd = isExisting ? 1 : 0;
        const lineId = isExisting ? r.id : 0;

        if (r.display_type === 'line_section') {
          return [cmd, lineId, {
            display_type: 'line_section',
            name: r.productName || r.remark || 'Section',
            product_id: false,
            product_uom_qty: 0,
            price_unit: 0,
            discount: 0,
            sequence: idx * 10
          }];
        }

        let finalProdId = resolveGhostId(r.productId, 'product');
        const numericProdId = Number(finalProdId);

        if (isNaN(numericProdId) || numericProdId <= 0) {
          // If editing and we have a productId string that might be valid (e.g. from Odoo), try parsing it directly
          const fallbackId = parseInt(r.productId);
          if (!isNaN(fallbackId) && fallbackId > 0) {
            finalProdId = fallbackId;
          } else {
            console.warn(`[Save Order] Skipping line ${idx} - Invalid Product ID:`, r.productId);
            return null;
          }
        } else {
          finalProdId = numericProdId;
        }

        return [cmd, lineId, {
          product_id: parseInt(finalProdId),
          product_uom_qty: parseFloat(r.qty) || 0,
          price_unit: parseFloat(r.price) || 0,
          discount: parseFloat(r.discount) || 0,
          name: r.description || r.productName || r.remark || '', 
          line_note: r.line_note || '',
          architect_id: parseInt(orderHeader.architectId) || false,
          electrician_id: parseInt(orderHeader.electricianId) || false,
          sequence: idx * 10
        }];
      }).filter(Boolean);

      console.log(`[Save Order] Prepared ${finalProductLines.length} product lines for submission.`);

      if (finalProductLines.length === 0 && !isSelection) {
        setLoading(false);
        console.error("[Save Order] Submission blocked: Rows present in state but no valid product lines formed.", rows);
        return alert("Validation error: None of your product lines have a valid ID. Please re-select the products.");
      }

      const amyNoteLines = [];
      let chatterText = "";

      // Helper to generate a unique filename
      const genName = (type, i) => {
        const typeInfo = masterData.amy_note_types?.find(t => String(t.id) === String(type));
        const typeLabel = typeInfo ? typeInfo.title : type;
        return `${typeLabel}_note_${Date.now()}_${i}.png`;
      };

      // ── GRANULAR UPDATE STRATEGY ──────────────────────────────────────────
      // Step 1: Handled deleted records
      deletedActivityIds.forEach(id => {
        amyNoteLines.push([2, id, 0]); // (2, id, 0) = Unlink and delete
      });

      // Step 2: Update existing or create new notes (from both categorized activities and general generalNotes)
      Object.keys(activityHistory).forEach(type => {
        (activityHistory[type] || []).forEach(hNote => {
          const base64Images = (hNote.images || []).map(img => {
            if (typeof img !== 'string' || !img.includes(',')) return null;
            return img.split(',')[1];
          }).filter(Boolean);

          const payload = {
            note_type: type,
            text: hNote.text || '',
            image: base64Images.map((img, i) => [0, 0, { datas: img, name: genName(type, i) }])
          };

          if (hNote.is_from_backend && hNote.id && typeof hNote.id === 'number') {
            // CRITICAL: Must send note_type in update command to prevent losing it in backend
            amyNoteLines.push([1, hNote.id, { 
              text: payload.text,
              note_type: payload.note_type 
            }]); 
            if (payload.image.length > 0) {
              amyNoteLines.push([1, hNote.id, { image: payload.image }]);
            }
          } else {
            amyNoteLines.push([0, 0, payload]);
          }
        });
      });

      // ────────────────────────────────────────────────────────────────────────

      // Step 3: Flush any text still in input boxes
      Object.keys(activityInputs).forEach(type => {
        const input = activityInputs[type];
        if (input && (input.text || (input.images && input.images.length > 0))) {
          const base64Images = (input.images || []).map(img =>
            (typeof img === 'string' && img.includes(',')) ? img.split(',')[1] : null
          ).filter(Boolean);
          amyNoteLines.push([0, 0, {
            note_type: type,
            text: input.text || '',
            image: base64Images.map((img, i) => [0, 0, { datas: img, name: genName(type, i) }])
          }]);
        }
      });
      // ────────────────────────────────────────────────────────────────────────

      // 2. Build the remark text. 
      //    CRITICAL: We now only send TRULY NEW messages to the chatter (chatter_notes).
      //    We STOP sending the full joined history in the 'remark' field because it 
      //    causes the backend to duplicate existing lines in the Remarks tab.
      const chatterNotes = generalNotes.filter(n => n.is_new).map(n => n.text).filter(Boolean);
      chatterText = chatterNotes.join('\n---\n');

      console.log("[Save Order] Remark length:", chatterText.length, "| New chatter notes:", chatterNotes.length, "| Amy note commands:", amyNoteLines.length);

      const ensureIsoDate = (dateVal) => {
        if (!dateVal) return null;
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateVal)) {
          const [d, m, y] = dateVal.split('-');
          return `${y}-${m}-${d}`;
        }
        return dateVal;
      };

      // 3. Activities — same clear-all + re-insert approach.
      //    Send all current activities as fresh records; backend clears old ones first.
      const finalExtraData = {
        architect_id: parseInt(orderHeader.architectId) || false,
        electrician_id: parseInt(orderHeader.electricianId) || false,
        remark: chatterText.trim() || '', // Now only contains NEW notes safely
        amy_note_lines: amyNoteLines,
        chatter_notes: chatterNotes,
        is_desc: !!orderHeader.is_desc,
        is_image: !!orderHeader.is_image,
        is_beam: !!orderHeader.is_beam,
        is_automate: !!orderHeader.is_automate,
        state: targetState || (isSelection ? 'selection' : isOrder ? 'sale' : 'draft'),
        date_order: ensureIsoDate(orderHeader.date),
        opportunity_id: orderHeader.opportunity_id || false,
        // All scheduled activities (existing + new) — backend will clear old ones and recreate
        activities: scheduledActivities,
        clear_activities: true   // Signal backend to unlink all existing activities before creating
      };


      // Ensure relational IDs are strictly numeric or false (Odoo constraint)
      if (finalExtraData.architect_id && isNaN(finalExtraData.architect_id)) finalExtraData.architect_id = false;
      if (finalExtraData.electrician_id && isNaN(finalExtraData.electrician_id)) finalExtraData.electrician_id = false;

      console.log("Submitting order with state:", finalExtraData.state);
      
      const resolvedPid = resolveGhostId(finalPartnerId, 'partner');
      let resPartnerId = parseInt(resolvedPid);
      
      if (isNaN(resPartnerId)) {
        // Final attempt name-based lookup
        const namePart = String(resolvedPid).includes('-') ? resolvedPid.split('-').slice(1).join('-') : resolvedPid;
        const matching = masterData.partners.find(p => p.name === namePart && Number.isInteger(Number(p.id)));
        resPartnerId = matching ? Number(matching.id) : 0;
      }

      if (!resPartnerId || resPartnerId <= 0) {
        setLoading(false);
        return alert("Please select a valid Customer from the dropdown before saving.");
      }
      
      const res = editId 
        ? await odooService.updateQuotation(editId, resPartnerId, finalProductLines, finalExtraData)
        : await odooService.createQuotation(resPartnerId, finalProductLines, finalExtraData);
        
      if (res && (res.success || res.id)) {
        clearDraft();
        const finalId = editId || res.id || (typeof res === 'number' ? res : res.data?.id);
        onNavigate('order-detail', finalId);
      } else {
        alert(res.error?.message || "Error processing order");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Professionals selected above via useMemo

  if (loading) return <div className="p-20 text-center text-slate-500">Processing...</div>;

  return (
    <div className="create-order-page dt-page">
      {/* Redundant inner header removed - using app navbar instead */}
      <div className="co-container" style={{ padding: '0.5rem' }}>
        <div className="co-card lead-card" style={{ padding: '0.75rem' }}>
          <div className="co-card-header" style={{ marginBottom: '0.4rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Customer Selection</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {orderHeader.partnerId && (
                <button 
                  className="co-btn-icon" 
                  style={{ backgroundColor: '#f1f5f9', color: '#6366f1' }}
                  onClick={() => {
                    const returnRoute = isSelection ? 'create-selection' : isOrder ? 'create-direct-order' : 'create-order';
                    onNavigate('create-customer', orderHeader.partnerId, { 
                      returnRoute,
                      orderEditId: editId,
                      formState: { orderHeader, rows, generalNotes, activityHistory, scheduledActivities }
                    });
                  }}
                  title="Edit Customer"
                >
                  <Edit2 size={16} />
                </button>
              )}
              <button 
                className="co-btn-icon" 
                onClick={() => {
                  const returnRoute = isSelection ? 'create-selection' : isOrder ? 'create-direct-order' : 'create-order';
                  onNavigate('create-customer', null, { 
                    returnRoute,
                    orderEditId: editId,
                    formState: { orderHeader, rows, generalNotes, activityHistory, scheduledActivities } 
                  });
                }}
                title="Add Customer"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="co-card-body">
            {isMobile ? (
              <>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Select Customer *</label>
                    <SearchableSelect
                      placeholder="Select Customer"
                      value={orderHeader.partnerId}
                      defaultValue={orderHeader.partnerName}
                      small
                      onChange={(val) => {
                        const selected = masterData.partners.find(p => String(p.id) === String(val));
                        setOrderHeader({ 
                          ...orderHeader, 
                          partnerId: val,
                          partnerName: selected?.name || orderHeader.partnerName,
                          architectId: selected?.architect_id || orderHeader.architectId,
                          electricianId: selected?.electrician_id || orderHeader.electricianId
                        });
                      }}
                      options={partnerOptions}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '18px', minWidth: '100px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Phone:</span>
                      <span style={{ fontWeight: 800, color: '#334155' }}>{selectedPartner?.phone || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>GSTIN:</span>
                      <span style={{ fontWeight: 800, color: '#334155' }}>{selectedPartner?.vat || '-'}</span>
                    </div>
                  </div>
                </div>
                {selectedPartner && (
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px', display: 'block' }}>Full Address</label>
                    <div style={{ fontSize: '14px', fontStyle: 'italic', color: '#64748b', padding: '0 2px' }}>
                      {[selectedPartner.street, selectedPartner.street2, selectedPartner.city, selectedPartner.state_name || (selectedPartner.state_id ? selectedPartner.state_id[1] : null), selectedPartner.zip].filter(Boolean).join(', ') || 'No address provided'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 2.5fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Select Customer *</label>
                  <SearchableSelect
                    placeholder="Select Customer"
                    value={orderHeader.partnerId}
                    defaultValue={orderHeader.partnerName}
                    onChange={(val) => {
                      const selected = masterData.partners.find(p => String(p.id) === String(val));
                      setOrderHeader({ 
                        ...orderHeader, 
                        partnerId: val,
                        partnerName: selected?.name || orderHeader.partnerName,
                        architectId: selected?.architect_id || orderHeader.architectId,
                        electricianId: selected?.electrician_id || orderHeader.electricianId
                      });
                    }}
                    options={partnerOptions}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Phone Number</label>
                  <div style={{ height: '32px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 10px', borderRadius: '2px', border: '1px solid #ddd', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {selectedPartner?.phone || '-'}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>GSTIN</label>
                  <div style={{ height: '32px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 10px', borderRadius: '2px', border: '1px solid #ddd', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {selectedPartner?.vat || '-'}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Full Address</label>
                  <div style={{ height: '32px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 10px', borderRadius: '2px', border: '1px solid #ddd', fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[selectedPartner?.street, selectedPartner?.street2, selectedPartner?.city, selectedPartner?.state_name || (selectedPartner?.state_id ? selectedPartner?.state_id[1] : null), selectedPartner?.zip].filter(Boolean).join(', ') || 'No address provided'}
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Professionals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fcfcfd' }}>
                <label style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Architect</label>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '2px' : '1.5rem', padding: '2px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {selectedArchitect?.name || selectedPartner?.architect_name || (orderHeader.architectId ? 'Architect Selected' : '-')}
                  </span>
                  {(selectedArchitect?.phone || selectedPartner?.architect_phone) && (
                    <span style={{ fontSize: isMobile ? '11px' : '13px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={isMobile ? 12 : 14} className="text-blue-500" />
                      {selectedArchitect?.phone || selectedPartner.architect_phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fcfcfd' }}>
                <label style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Electrician</label>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '2px' : '1.5rem', padding: '2px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {selectedElectrician?.name || selectedPartner?.electrician_name || (orderHeader.electricianId ? 'Electrician Selected' : '-')}
                  </span>
                  {(selectedElectrician?.phone || selectedPartner?.electrician_phone) && (
                    <span style={{ fontSize: isMobile ? '11px' : '13px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={isMobile ? 12 : 14} className="text-blue-500" />
                      {selectedElectrician?.phone || selectedPartner.electrician_phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="co-expandable-card">
          <div className="co-expand-header" onClick={() => setShowProducts(!showProducts)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="co-card-icon-pill">
                <ShoppingCart size={18} />
              </div>
              <div className="co-card-title-stack">
                <h2>{isSelection ? 'Selection Products' : 'Quotation Items'}</h2>
              </div>
            </div>
            <div className={`co-chevron ${showProducts ? 'open' : ''}`}>
              <ChevronRight size={18} />
            </div>
          </div>
          {showProducts && (
            <div className="co-card-body product-cards-list" style={{ paddingTop: '0.75rem', paddingLeft: '0.75rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '0.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_desc} onChange={(e) => setOrderHeader({...orderHeader, is_desc: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Description
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_image} onChange={(e) => setOrderHeader({...orderHeader, is_image: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Image
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_beam} onChange={(e) => setOrderHeader({...orderHeader, is_beam: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Beam
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_automate} onChange={(e) => setOrderHeader({...orderHeader, is_automate: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Automation
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: isMobile ? '0' : 'auto', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', width: isMobile ? '100%' : 'auto' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>Global Disc %</span>
                  <input 
                    type="number" 
                    placeholder="Apply to all..."
                    style={{ width: '80px', height: '32px', border: '1px solid #d7dee8', borderRadius: '8px', textAlign: 'center', fontWeight: 800, color: '#1e293b' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat(e.target.value) || 0;
                        setRows(rows.map(r => ({ ...r, discount: val })));
                        e.target.blur();
                      }
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>(Enter to apply)</span>
                </div>
              </div>

              <div className="product-scroll-wrapper" style={{ overflowX: isMobile ? 'visible' : 'auto', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ minWidth: isMobile ? '0' : 'max-content' }}>
                  {rows.length > 0 && !isMobile && (
                    <div className="product-list-header-row" style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderBottom: '2px solid #f8fafc', 
                        display: 'grid',
                        gridTemplateColumns: `1.2fr 1fr 300px ${orderHeader.is_image ? '120px' : ''} ${orderHeader.is_beam ? '180px' : ''} 40px`.trim().replace(/\s+/g, ' '),
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Product</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Qty</div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Disc</div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Price</div>
                      </div>
                      {orderHeader.is_image && (
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Image</div>
                      )}
                      {orderHeader.is_beam && (
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Beam</div>
                      )}
                      <div />
                    </div>
                  )}

                  <Reorder.Group 
                    axis="y" 
                    values={rows} 
                    onReorder={setRows}
                    className="product-rows-container" 
                    style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
                  >
                    {rows.map((r, idx) => (
                      <ProductRow 
                        key={r.id}
                        r={r} 
                        idx={idx} 
                        rows={rows} 
                        setRows={setRows}
                        isMobile={isMobile}
                        isOrder={isOrder}
                        editId={editId}
                        masterData={masterData}
                        productOptions={productOptions}
                        orderHeader={orderHeader}
                        handleRowChange={handleRowChange}
                        addRow={addRow}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </Reorder.Group>
                </div>
              </div>
            </div>
          )}

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '8px', flex: isMobile ? '1' : '0 0 auto' }}>
                <button 
                  className="co-btn-secondary" 
                  onClick={addRow} 
                  style={{ height: '32px', padding: '0 12px', fontSize: '13px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} />
                  Add Product
                </button>
                <button 
                  className="co-btn-secondary" 
                  onClick={addSection} 
                  style={{ height: '32px', padding: '0 12px', fontSize: '13px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} />
                  Add Section
                </button>
              </div>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '0.5rem' : '1.25rem', 
                  alignItems: isMobile ? 'flex-end' : 'center', 
                  marginLeft: isMobile ? '0' : 'auto', 
                  width: isMobile ? '100%' : 'auto', 
                  justifyContent: isMobile ? 'flex-end' : 'flex-end', 
                  padding: '8px 12px',
                  background: isMobile ? '#f8fafc' : 'transparent',
                  borderRadius: '12px',
                  marginTop: isMobile ? '0.5rem' : '0',
                  border: isMobile ? '1px solid #e2e8f0' : 'none'
                }}>
                   <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: 'flex-end' }}>
                     <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                       <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.02em' }}>GROSS:</span>
                       <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Rs.{rows.reduce((s, r) => s + (parseFloat(r.price)||0)*(parseFloat(r.qty)||0), 0).toLocaleString()}</span>
                     </div>
                     <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                       <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.02em' }}>DISC:</span>
                       <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>-Rs.{rows.reduce((s, r) => s + (parseFloat(r.price)||0)*(parseFloat(r.qty)||0)*(parseFloat(r.discount)||0)/100, 0).toLocaleString()}</span>
                     </div>
                   </div>
                   {!isMobile && <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }} />}
                   {isMobile && <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e8f0' }} />}
                   <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: 'flex-end' }}>
                     <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: 900, letterSpacing: '0.02em' }}>FINAL:</span>
                     <span style={{ fontSize: isMobile ? '24px' : '18px', fontWeight: 900, color: '#059669' }}>Rs.{total.toLocaleString()}</span>
                   </div>
                </div>
              </div>
            </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
          {/* Schedule Activity Section */}
          <div className="co-expandable-card activity-schedule-card" style={{ marginBottom: 0, marginTop: 0 }}>
          <div className="co-expand-header" onClick={() => setShowActivitySection(!showActivitySection)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="co-card-icon-pill" style={{ backgroundColor: '#f0f9ff', color: '#0ea5e9' }}>
                <Calendar size={18} />
              </div>
              <div className="co-card-title-stack" style={{ height: '18px', display: 'flex', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155' }}>Tasks</h2>
              </div>
            </div>
            <div className={`co-chevron ${showActivitySection ? 'open' : ''}`}>
              <ChevronRight size={18} />
            </div>
          </div>

          {showActivitySection && (
            <div className="co-card-body" style={{ padding: '0.5rem 1rem' }}>
              {/* List of planned activities moved to top */}

              {/* List of planned activities */}
              {scheduledActivities.length > 0 && (
                <div className="planned-activities" style={{ marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>Planned Activities</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', borderBottom: '8px solid transparent' }}>
                    {scheduledActivities.map(act => {
                      const typeName = masterData.activity_types?.find(t => t.id === act.activity_type_id)?.name || 'Activity';
                      const userName = masterData.users?.find(u => u.id === parseInt(act.user_id))?.name || 'Self';
                      return (
                        <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', marginTop: '2px' }}>
                              <Clock size={16} className="text-blue-500" />
                            </div>
                            <div>
                              {editingTaskId === act.id ? (
                                 <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f6', marginTop: '4px' }}>
                                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                      <input 
                                        type="date" 
                                        className="co-input-v2" 
                                        value={taskEditText.date_deadline} 
                                        onChange={e => setTaskEditText({...taskEditText, date_deadline: e.target.value})}
                                        style={{ height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                      />
                                      <SearchableSelect
                                        placeholder="Assignee"
                                        value={taskEditText.user_id}
                                        small
                                        options={userOptions}
                                        onChange={(val) => setTaskEditText(prev => ({ ...prev, user_id: val }))}
                                      />
                                   </div>
                                   <textarea 
                                      className="co-textarea" 
                                      value={taskEditText.note} 
                                      onChange={e => setTaskEditText({...taskEditText, note: e.target.value})}
                                      placeholder="Message..."
                                      style={{ minHeight: '70px', fontSize: '12px', padding: '8px', width: '100%', marginBottom: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                   />
                                   <div style={{ display: 'flex', gap: '12px' }}>
                                      <button 
                                        onClick={() => {
                                          setScheduledActivities(prev => prev.map(a => a.id === act.id ? { ...taskEditText } : a));
                                          setEditingTaskId(null);
                                        }}
                                        style={{ color: '#3b82f6', fontWeight: 800, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                                      >
                                        Save
                                      </button>
                                      <button 
                                        onClick={() => setEditingTaskId(null)}
                                        style={{ color: '#64748b', fontWeight: 600, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                                      >
                                        Cancel
                                      </button>
                                   </div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{act.summary || typeName}</div>
                                  {act.note && (
                                    <div style={{ fontSize: '13px', color: '#475569', margin: '4px 0 6px', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: act.note }} />
                                  )}
                                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                                    <span>📅 {act.date_deadline}</span>
                                    <span>👤 {userName}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTaskId(act.id);
                                setTaskEditText({ 
                                  ...act,
                                  note: (act.note || '').replace(/<[^>]*>?/gm, '').trim()
                                });
                              }}
                              style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                              title="Edit Activity"
                            >
                              <Edit2 size={15} className="hover:text-blue-500" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduledActivities(prev => prev.filter(a => a.id !== act.id));
                              }}
                              style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                              title="Delete Activity"
                            >
                              <Trash size={16} className="hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Grid: Moved to bottom as requested */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '10px' }}>
                    <input 
                      type="date" 
                      className="co-input-border"
                      value={newActivity.date_deadline} 
                      onChange={e => setNewActivity(prev => ({ ...prev, date_deadline: e.target.value }))}
                      style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    />
                    <SearchableSelect
                      placeholder="Assignee"
                      value={newActivity.user_id}
                      small
                      options={userOptions}
                      onChange={(val) => setNewActivity(prev => ({ ...prev, user_id: val }))}
                    />
                </div>

                <textarea 
                  className="co-textarea"
                  value={newActivity.note} 
                  onChange={e => setNewActivity(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Message..."
                  style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', lineHeight: '1.5' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button 
                    onClick={() => {
                      let typeId = newActivity.activity_type_id;
                      if (!typeId && masterData.activity_types) {
                        const todoType = masterData.activity_types.find(t => t.name.toLowerCase().includes('todo') || t.name.toLowerCase().includes('to do')) || masterData.activity_types[0];
                        typeId = todoType?.id;
                      }
                      if (!typeId) return alert("Select activity type");
                      if (!newActivity.note.trim()) return alert("Please enter activity note");
                      
                      setScheduledActivities(prev => [...prev, { ...newActivity, activity_type_id: typeId, id: Date.now() }]);
                      setNewActivity({
                        activity_type_id: '',
                        summary: 'To Do',
                        note: '',
                        user_id: '',
                        date_deadline: new Date().toISOString().split('T')[0]
                      });
                    }}
                    style={{ 
                      background: '#0ea5e9', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '10px', 
                      height: '38px', 
                      padding: '0 20px', 
                      fontWeight: 800, 
                      fontSize: '13px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(14, 165, 233, 0.2)'
                    }}
                  >
                    <Zap size={16} fill="white" />
                    Add Activity
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

          <div className="co-expandable-card main-notes-card" style={{ marginBottom: 0, marginTop: 0 }}>
          <div className="co-expand-header" onClick={() => setShowNotes(!showNotes)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="co-card-icon-pill" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <Send size={18} />
              </div>
              <div className="co-card-title-stack" style={{ height: '18px', display: 'flex', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155' }}>Notes</h2>
              </div>
            </div>
            <div className={`co-chevron ${showNotes ? 'open' : ''}`}>
              <ChevronRight size={18} />
            </div>
          </div>
          
          {showNotes && (
            <div className="co-card-body">
              <div className="gn-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', borderBottom: '8px solid transparent', minHeight: '0' }}>
                {(() => {
                   const seen = new Set();
                   return generalNotes.filter(n => {
                     const text = (n.text || '').trim().toLowerCase();
                     if (seen.has(text)) return false;
                     seen.add(text);
                     return true;
                   });
                })().map(note => (
                  <div key={note.id} className="gn-note-card" style={{ 
                    background: '#fff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px', 
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: '#f1f5f9', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#64748b',
                          border: '1px solid #e2e8f0'
                        }}>
                          {note.by.substring(0,2).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                            {note.by}
                            {(() => {
                              const typeId = String(note.note_type_id || '').toLowerCase().trim();
                              if (!typeId) return null;
                              
                              const tInfo = masterData.amy_note_types?.find(t => {
                                const tid = String(t.id).toLowerCase();
                                return tid === typeId || tid.includes(typeId.replace(/s$/, '')) || typeId.includes(tid.replace(/s$/, ''));
                              });
                              return tInfo ? <span style={{ color: '#3b82f6', fontWeight: 600 }}> · {tInfo.title}</span> : <span style={{ color: '#64748b' }}> · {typeId}</span>;
                            })()}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{note.date}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setNoteEditText(note.text);
                          }} 
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }} 
                          title="Edit Note"
                          className="hover:text-blue-500 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteNote(note.id)} 
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }} 
                          title="Delete Note"
                          className="hover:text-red-500 transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="gn-card-content">
                      {editingNoteId === note.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <textarea 
                            className="co-textarea" 
                            value={noteEditText} 
                            onChange={e => setNoteEditText(e.target.value)} 
                            style={{ 
                              width: '100%', 
                              minHeight: '80px', 
                              padding: '10px', 
                              borderRadius: '8px', 
                              border: '1px solid #3b82f6',
                              fontSize: '14px'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => saveEditNote(note.id)}>Save Changes</button>
                            <button style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditingNoteId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ 
                          fontSize: '14px', 
                          lineHeight: '1.5', 
                          color: '#334155', 
                          margin: 0,
                          whiteSpace: 'pre-wrap'
                        }}>{(note.text || '').replace(/<[^>]*>?/gm, '').trim()}</p>
                      )}

                      {note.images && note.images.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                          {note.images.map((img, i) => (
                            <div key={i} style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img src={img} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="gn-input-card" style={{ 
                marginTop: '1.25rem', 
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1rem',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end'
              }}>
                <textarea 
                  placeholder="Add Note (Use Shift+Enter for new lines)" 
                  value={generalNoteInput} 
                  onChange={e => setGeneralNoteInput(e.target.value)}
                  style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    flex: 1,
                    minHeight: '48px',
                    maxHeight: '150px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'none',
                    backgroundColor: '#fff',
                    outline: 'none'
                  }} 
                />
                <button 
                  onClick={handleAddGeneralNote}
                  style={{ 
                    width: '42px', 
                    height: '42px', 
                    backgroundColor: '#3b82f6', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '10px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                    flexShrink: 0
                  }}
                  title="Send Note"
                >
                  <Zap size={20} fill="white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

        <div className="activity-section">
          <div className="activity-toggle-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', marginBottom: '0.5rem' }}>
             <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                <input type="checkbox" checked={showCategories} onChange={() => setShowCategories(!showCategories)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showCategories ? '#3b82f6' : '#cbd5e1', transition: '.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: showCategories ? '20px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                </span>
             </label>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Show Activity History</span>
          </div>

          {(() => {
            const getIcon = (type) => {
              const t = String(type || '').toLowerCase();
              if (t.includes('switch')) return <ToggleRight size={20} />;
              if (t.includes('fan')) return <Wind size={20} />;
              if (t.includes('ac')) return <Activity size={20} />;
              if (t.includes('curtain')) return <Layers size={20} />;
              if (t.includes('automation')) return <Zap size={20} />;
              if (t.includes('light')) return <Lightbulb size={20} />;
              if (t.includes('profile')) return <Layers size={20} />;
              if (t.includes('decorative')) return <Sparkles size={20} />;
              if (t.includes('other')) return <MoreHorizontal size={20} />;
              
              switch(t) {
                case 'switches': return <ToggleRight size={20} />;
                case 'fans': return <Wind size={20} />;
                case 'ac': return <Activity size={20} />;
                case 'curtains': return <Layers size={20} />;
                case 'automation': return <Zap size={20} />;
                case 'lights': return <Lightbulb size={20} />;
                case 'profiles': return <Layers size={20} />;
                case 'decorative': return <Sparkles size={20} />;
                default: return <MoreHorizontal size={20} />;
              }
            };

            const dynTypes = (masterData.amy_note_types || []).map(t => ({
              id: t.id,
              title: t.title,
              icon: getIcon(t.id),
              group: 'cat'
            }));

            const displayActs = [...dynTypes];

            // Ensure Tasks is always available if not explicitly coming from backend 
            // (though it usually should be in the Odoo selection list)

            return displayActs;
          })().map((act) => {
            if (act.group === 'cat' && !showCategories) return null;
            return (
              <div key={act.id} className="activity-card">
                <div className="activity-header" onClick={() => setExpandedCategoryIds(prev => ({ ...prev, [act.id]: !prev[act.id] }))}>
                  <div className="activity-title-group">
                    <span className="activity-icon">{act.icon}</span>
                    <span className="activity-label">{act.title}</span>
                  </div>
                  <div className="activity-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddActivityNote(act.id);
                        setExpandedCategoryIds(prev => ({ ...prev, [act.id]: true }));
                      }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Add note to this section"
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <Plus size={16} />
                    </button>
                    <ChevronDown size={18} className={expandedCategoryIds[act.id] ? 'rotate-180' : ''} />
                  </div>
                </div>
                {expandedCategoryIds[act.id] && (
                  <div className="activity-body">
                      {(activityHistory[act.id] || []).map(note => (
                        <div key={note.id} className="activity-note" style={{ position: 'relative' }}>
                          <div className="note-avatar-wrapper">
                            <div className="note-avatar">{note.by.substring(0,2).toUpperCase()}</div>
                          </div>
                          <div className="note-content-wrapper">
                            {editingActivityNoteId === note.id ? (
                              <div style={{ marginBottom: '10px' }}>
                                <textarea 
                                  className="v2-textarea" 
                                  value={activityNoteEditText} 
                                  onChange={e => setActivityNoteNoteEditText(e.target.value)}
                                  style={{ minHeight: '60px', width: '100%', padding: '8px' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <button className="text-blue-600 font-semibold text-[13px]" onClick={() => handleSaveActivityNote(act.id, note.id)}>Save</button>
                                  <button className="text-slate-500 text-[13px]" onClick={() => setEditingActivityNoteId(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              note.text && <p className="note-text" style={{ fontSize: '14px', lineHeight: '1.4' }}>{note.text}</p>
                            )}
                            
                            {note.images && note.images.length > 0 && (
                              <div className="note-images" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                                {note.images.map((img, i) => (
                                  <div key={i} style={{ position: 'relative', width: '110px', height: '110px' }}>
                                    <img 
                                      src={img} 
                                      alt="attachment" 
                                      style={{ width: '110px', height: '110px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                      onClick={() => window.open(img, '_blank')} 
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="note-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', color: '#94a3b8', fontSize: '12px' }}>
                                <span className="note-by">By {note.by}</span>
                                <span className="note-date">{note.date}</span>
                              </div>
                                <button onClick={() => handleDeleteActivityNote(act.id, note.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}>
                                  <Trash size={14} className="text-slate-300 hover:text-red-500" />
                                </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    <div className="add-note-form-v2">
                      <div className="note-half left-half">
                        <textarea placeholder={`Write ${act.title} notes...`} className="v2-textarea" value={activityInputs[act.id]?.text || ''} onChange={e => setActivityInputs(prev => ({ ...prev, [act.id]: { ...(prev[act.id] || { text: '', images: [] }), text: e.target.value } }))} />
                      </div>
                      <div className="note-half right-half">
                        <label 
                          className={`v2-upload-zone ${dragActiveId === act.id ? 'dragging' : ''}`}
                          tabIndex="0"
                          onPaste={(e) => handleNotePaste(e, act.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragActiveId(act.id);
                          }}
                          onDragLeave={() => setDragActiveId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragActiveId(null);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              handleImageUpload(act.id, e.dataTransfer.files);
                            }
                          }}
                          style={{ outline: 'none' }}
                        >
                          <Paperclip size={20} />
                          <span className="upload-text">
                            {dragActiveId === act.id ? 'Drop images here' : 'Upload or Paste Images'}
                          </span>
                          {!isMobile && <span className="upload-hint">or Drag & Drop</span>}
                          <input type="file" multiple accept="image/*" className="hidden-file-input" onChange={e => handleImageUpload(act.id, e.target.files)} />
                        </label>

                        {activityInputs[act.id]?.images?.length > 0 && (
                          <div className="v2-image-previews">
                            {activityInputs[act.id].images.map((img, i) => (
                              <div key={i} className="v2-img-item">
                                <img src={img} alt="attachment" />
                                <button className="v2-img-remove" onClick={() => handleRemoveImageInput(act.id, i)}><X size={10} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="co-page-footer" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '1rem',
          padding: '1.25rem 0.75rem',
          borderTop: '1px solid #e2e8f0',
          marginTop: '2rem',
          flexWrap: 'wrap',
          backgroundColor: '#fff'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: isMobile ? '100%' : '300px' }}>
            <button 
              className="co-btn co-btn-primary" 
              onClick={(e) => handleProcess(e)} 
              disabled={loading}
              style={{ 
                flex: 1, 
                maxWidth: isMobile ? '100%' : '400px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.2)',
                border: 'none',
                height: '52px',
                fontSize: '15px',
                fontWeight: 700,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <CheckCircle size={18} />
              {loading ? "Processing..." : (
                editId 
                  ? (isSelection ? "Update Selection" : (isOrder ? "Update Order" : "Update Quotation"))
                  : (isSelection ? "Create Selection" : (isOrder ? "Create Order" : "Submit Quotation"))
              )}
            </button>
            
            <button 
              className="co-btn co-btn-secondary" 
              onClick={() => {
                if (confirm("Any unsaved changes will be lost. Continue?")) {
                  clearDraft();
                  if (onBack) onBack();
                  else {
                    const finalReturn = extraData?.returnRoute || (isSelection ? 'crm' : (isOrder ? 'orders' : 'quotations'));
                    onNavigate(finalReturn);
                  }
                }
              }}
              style={{
                height: '52px',
                padding: '0 1.75rem',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                color: '#64748b',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              Cancel
            </button>
          </div>
          
          {editId && !isOrder && (
            <div style={{ display: 'flex', gap: '0.75rem', width: isMobile ? '100%' : 'auto' }}>
              {isSelection && (
                <button 
                  className="co-btn" 
                  style={{ 
                    flex: isMobile ? 1 : 'none',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                    color: '#fff',
                    border: 'none',
                    height: '52px',
                    padding: '0 1.5rem',
                    borderRadius: '14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }} 
                  onClick={(e) => handleProcess(e, 'draft')}
                  disabled={loading}
                >
                  <FileText size={16} />
                  Confirm Quotation
                </button>
              )}
              <button 
                className="co-btn" 
                style={{ 
                  flex: isMobile ? 1 : 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  color: '#fff',
                  border: 'none',
                  height: '52px',
                  padding: '0 1.5rem',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }} 
                onClick={(e) => handleProcess(e, 'sale')}
                disabled={loading}
              >
                <ArrowRight size={16} />
                Confirm Order
              </button>
            </div>
          )}
        </div>
      </div> 
    </div>
  );
};

export default CreateOrder;
