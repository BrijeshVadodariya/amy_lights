import React, { useState, useEffect, useMemo } from 'react';
import { odooService } from './services/odoo';
import SearchableSelect from './components/SearchableSelect';
import { 
  Plus, 
  X, 
  ChevronLeft,
  ChevronRight, 
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
import { Reorder } from 'framer-motion';
import './CreateOrder.css';

const createProductRow = () => ({
  id: Date.now(),
  productId: '',
  qty: 1,
  price: 0,
  discount: 0,
  remark: '',
  uom: 'Units'
});

// Simple in-memory cache for products/partners to speed up loading
const dataCache = {
  products: null,
  partners: null,
  architects: null,
  electricians: null
};

const CreateOrder = ({ editId, onNavigate, isSelection, isOrder, extraData }) => {
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({
    partners: [],
    products: [],
    users: [],
    activity_types: [],
    architects: [],
    electricians: []
  });

  const [orderHeader, setOrderHeader] = useState({
    partnerId: '',
    date: new Date().toISOString().split('T')[0],
    remark: '',
    architectId: '',
    electricianId: '',
    is_desc: false,
    is_image: false,
    is_beam: false,
    is_automate: false
  });

  const [showProducts, setShowProducts] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showMore, setShowMore] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEditText, setTaskEditText] = useState({});
  const [noteEditText, setNoteEditText] = useState("");
  const [editingActivityNoteId, setEditingActivityNoteId] = useState(null);
  const [activityNoteEditText, setActivityNoteNoteEditText] = useState("");

  const [rows, setRows] = useState([
    createProductRow()
  ]);

  const [generalNotes, setGeneralNotes] = useState([]);
  const [generalNoteInput, setGeneralNoteInput] = useState('');
  const [deletedActivityIds, setDeletedActivityIds] = useState([]);
  const safeNavigate = (to) => {
    onNavigate(to);
  };

  const [activityInputs, setActivityInputs] = useState({});
  const [activityHistory, setActivityHistory] = useState({
    call: [],
    whatsapp: [],
    visit: [],
    email: []
  });
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
      if (newData.products.length > 0 || newData.partners.length > 0) {
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
            phone: data.partner_phone || data.phone || data.mobile || '',
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

          const allTypeNotes = [];
          noteData.forEach(note => {
            const type = note.note_type || note.type || 'others';
            
            // Map image URLs if present, ensuring they have auth tokens
            const noteImages = (note.images || note.image || []).map(url => {
              if (typeof url !== 'string') return null;
              const hasToken = url.includes('token=') || url.includes('session_id=');
              if (hasToken) return url;
              const connector = url.includes('?') ? '&' : '?';
              return `${url}${connector}token=${sessionId}&db=${dbName}`;
            }).filter(Boolean);

            const processedNote = {
              id: note.id || Math.random(),
              text: (note.text || '').replace(/<[^>]*>?/gm, '').trim(),
              images: noteImages,
              by: note.author || 'System',
              date: note.create_date || '', // Use backend date if available
              is_from_backend: true,
              is_new: false
            };
            
            if (type === 'others' || type === 'remark' || type === 'note') {
              allTypeNotes.push(processedNote);
            } else {
              if (!mappedHistory[type]) mappedHistory[type] = [];
              mappedHistory[type].push(processedNote);
            }
          });
          
          setGeneralNotes(prev => {
            let combined = [...allTypeNotes];
            if (data.remark) {
              const cleanRemark = data.remark.replace(/<\/?[^>]+(>|$)/g, "\n").trim();
              if (cleanRemark) {
                // Split by common separators if they were joined
                const individualNotes = cleanRemark.split(/\n|<br\s*\/?>|\|/i)
                  .map(t => t.trim())
                  .filter(t => t.length > 0);

                individualNotes.forEach((text, idx) => {
                  // Only add if not already present in allTypeNotes (deduplicate)
                  if (!combined.some(existing => existing.text === text)) {
                    combined.push({
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
            return combined;
          });
          setActivityHistory(mappedHistory);
          // Auto-expand categories if we have history
          if (Object.keys(mappedHistory).length > 0) {
            setShowCategories(true);
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
        const remark = data.remark || data.note || '';
        if (remark) {
           // Try splitting by common separators used in the backend
           const parts = remark.split(/\n---\n|<br\s*\/?>/).filter(Boolean);
           setGeneralNotes(parts.map(t => ({
             id: `hist-${Math.random()}`,
             text: t.replace(/<[^>]*>?/gm, '').trim(), // Global tag cleanup
             date: data.date_order || '',
             by: t.match(/<b>(.*?)<\/b>/)?.[1] || 'Odoo',
             is_new: false
           })));
        }

        // 3. Sync Scheduled Activities (Tasks)
        if (data.activities && Array.isArray(data.activities)) {
           setScheduledActivities(data.activities.map(act => ({
             id: act.id,
             activity_type_id: act.activity_type_id,
             summary: act.summary || act.activity_type_name || 'Activity',
             note: (act.note || '').replace(/<[^>]*>?/gm, '').trim(),
             user_id: act.user_id,
             date_deadline: act.date_deadline || ''
           })));
        }
      }
    } catch (err) {
      console.error('Edit fetch failed', err);
    }
    finally { setLoading(false); }
  }, [editId]); // Removed masterData dependencies to prevent infinite reload loop

  useEffect(() => {
    if (extraData) {
      const { preFilledPartnerId, preFilledProducts, partner_id } = extraData;
      const targetPartnerId = preFilledPartnerId || partner_id;
      
      if (targetPartnerId) {
        fetchMasterData().then(() => {
          odooService.getPartners().then(partners => {
            const partner = partners?.find(p => String(p.id) === String(targetPartnerId));
            if (partner) {
              setOrderHeader(prev => ({ 
                ...prev, 
                partnerId: targetPartnerId,
                architectId: partner.architect_id || '',
                electricianId: partner.electrician_id || ''
              }));
            } else {
              setOrderHeader(prev => ({ ...prev, partnerId: targetPartnerId }));
            }
          });
        });
      }
      
      if (preFilledProducts && preFilledProducts.length > 0) {
        setRows(preFilledProducts.map(p => ({
          id: Date.now() + Math.random(),
          productId: p.productId,
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

  const handleAddGeneralNote = () => {
    if (!generalNoteInput.trim()) return;
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

  const saveEditNote = (id) => {
    setGeneralNotes(prev => prev.map(n => n.id === id ? { ...n, text: noteEditText } : n));
    setEditingNoteId(null);
    setNoteEditText("");
  };

  const handleDeleteNote = (id) => {
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
    if (!input.text && input.images.length === 0) return;
    
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
    if (editId) fetchEditOrder();
    // Only triggering on editId mount/change to prevent recursive reloads
  }, [editId]); 

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        if (field === 'productId') {
          const parsedId = /^\d+$/.test(value) ? parseInt(value) : value;
          const prod = masterData.products.find(p => String(p.id) === String(parsedId));
          return { 
            ...r, 
            productId: value, 
            price: prod ? prod.price : 0,
            beam: prod ? (prod.beam || '-') : '-',
            description: prod ? (prod.description || '') : ''
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
      beam: '-',
      description: '',
      image_url: '',
      uom: 'Units'
    }]);
    
    // TAB Focus logic: Focus the new product select after it renders
    setTimeout(() => {
      const rows = document.querySelectorAll('.product-row');
      const lastRow = rows[rows.length - 1];
      const select = lastRow?.querySelector('.ss-control');
      if (select) select.focus();
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
         phone: newCustomer.mobile,
         email: '', // Not in form
         comment: newCustomer.billing_address // Simplified
      });
      if (res) {
        setMasterData(prev => ({ ...prev, partners: [...prev.partners, res] }));
        setOrderHeader(prev => ({ ...prev, partnerId: res.id }));
        setShowCustomerModal(false);
        setNewCustomer({ name: '', billing_name: '', contact_person: '', mobile: '', billing_address: '', delivery_address: '', electrician: '', electrician_number: '', architect: '', architect_number: '', office_contact_person: '' });
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

  const handleProcess = async () => {

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
    if (productLines.length === 0) {
        return alert("Please select at least one product before saving.");
    }

    setLoading(true);
    try {
      const finalProductLines = productLines.map((r, idx) => {
        // If it's a section, we send it without product_id and with display_type
        if (r.display_type === 'line_section') {
          return [0, 0, {
            display_type: 'line_section',
            name: r.productName || 'Section',
            product_id: false,
            product_uom_qty: 0,
            price_unit: 0,
            discount: 0
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

        // Return Odoo command tuple format [0, 0, {data}] for proper backend parsing
        // Note: The backend uses a (5, 0, 0) clear-all strategy on edit, 
        // so we can safely send every line as a New Line [0, 0, vals] to ensure sync.
        return [0, 0, {
          product_id: parseInt(finalProdId),
          product_uom_qty: parseFloat(r.qty) || 1,
          price_unit: parseFloat(r.price) || 0,
          discount: parseFloat(r.discount) || 0,
          name: r.remark || '', 
          architect_id: parseInt(orderHeader.architectId) || false,
          electrician_id: parseInt(orderHeader.electricianId) || false
        }];
      }).filter(Boolean);

      console.log(`[Save Order] Prepared ${finalProductLines.length} product lines for submission.`);

      if (finalProductLines.length === 0) {
        setLoading(false);
        console.error("[Save Order] Submission blocked: Rows present in state but no valid product lines formed.", rows);
        return alert("Validation error: None of your product lines have a valid ID. Please re-select the products.");
      }

      const amyNoteLines = [];
      let chatterText = "";

      // Helper to generate a unique filename
      const genName = (type, i) => `${type}_note_${Date.now()}_${i}.png`;

      // ── GRANULAR UPDATE STRATEGY ──────────────────────────────────────────
      // Step 1: Handled deleted records
      deletedActivityIds.forEach(id => {
        amyNoteLines.push([2, id, 0]); // (2, id, 0) = Unlink and delete
      });

      // Step 2: Update existing or create new notes
      Object.keys(activityHistory).forEach(type => {
        (activityHistory[type] || []).forEach(hNote => {
          // Extract base64 only for local images (data URLs)
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
            // Existing note: Update text. Odoo keeps existing images in Many2many unless we tell it to clear them.
            amyNoteLines.push([1, hNote.id, { text: payload.text }]); 
            // If there are NEW images added to this existing note line, we can add them here too
            if (payload.image.length > 0) {
              amyNoteLines.push([1, hNote.id, { image: payload.image }]);
            }
          } else {
            // New note: Create fresh
            amyNoteLines.push([0, 0, payload]);
          }
        });
      });

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

      // 2. Build the remark text from ALL current general notes (replaces previous value on backend).
      //    Each note is stored as its own line — backend receives the full joined text.
      //    Only truly NEW notes (added in this session) are sent as chatter messages.
      const currentGeneralNotesText = generalNotes.map(n => n.text).filter(Boolean).join('\n---\n');
      chatterText = currentGeneralNotesText;

      const chatterNotes = generalNotes.filter(n => n.is_new).map(n => n.text).filter(Boolean);

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
        remark: chatterText.trim() || orderHeader.remark || '',
        amy_note_lines: amyNoteLines,
        chatter_notes: chatterNotes,
        is_desc: !!orderHeader.is_desc,
        is_image: !!orderHeader.is_image,
        is_beam: !!orderHeader.is_beam,
        is_automate: !!orderHeader.is_automate,
        state: isSelection ? 'selection' : isOrder ? 'sale' : 'draft',
        date_order: ensureIsoDate(orderHeader.date),
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
        
      if (res.success) {
        setActivityHistory({});
        onNavigate(isSelection ? 'selection' : isOrder ? 'orders' : 'quotations');
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
      <div className="co-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', backgroundColor: '#fff' }}>
        <button className="co-btn-icon" onClick={() => safeNavigate(isSelection ? 'selection' : isOrder ? 'orders' : 'quotations')} style={{ backgroundColor: '#f1f5f9' }}>
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
          {editId ? (isSelection ? 'Edit Selection' : isOrder ? 'Edit Order' : 'Edit Quotation') : (isSelection ? 'Create Selection' : isOrder ? 'Create Order' : 'Create Quotation')}
        </h1>
      </div>
      <div className="co-container">
        <div className="co-card lead-card">
          <div className="co-card-header">
            <h3>Customer Selection</h3>
            <button className="co-btn-icon" onClick={() => {
              const returnRoute = isSelection ? 'create-selection' : isOrder ? 'create-direct-order' : 'create-order';
              onNavigate('create-customer', null, { returnRoute });
            }}>
              <Plus size={18} />
            </button>
          </div>
          <div className="co-card-body">
            {/* Row 1: Select Customer, Phone and GST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '1.25rem', marginBottom: isMobile ? '0.75rem' : '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1.2fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? '0.5rem' : '1.25rem', alignItems: isMobile ? 'start' : 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 700, color: isMobile ? '#94a3b8' : 'inherit', textTransform: isMobile ? 'uppercase' : 'none' }}>Select Customer *</label>
                  <SearchableSelect
                    placeholder="Select Customer"
                    value={orderHeader.partnerId}
                    defaultValue={orderHeader.partnerName}
                    small={isMobile}
                    onChange={(val) => {
                      const selected = masterData.partners.find(p => String(p.id) === String(val));
                      setOrderHeader({ 
                        ...orderHeader, 
                        partnerId: val,
                        architectId: selected?.architect_id || orderHeader.architectId,
                        electricianId: selected?.electrician_id || orderHeader.electricianId
                      });
                    }}
                    options={Array.from(new Map(masterData.partners.filter(p => p && p.id).map(p => [String(p.name).toLowerCase().trim(), p])).values()).map((p) => ({ value: p.id, label: p.name }))}
                  />
                </div>

                {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', minWidth: '40px' }}>Phone:</span>
                      <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>{selectedPartner?.phone || selectedPartner?.mobile || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', minWidth: '40px' }}>GSTIN:</span>
                      <span style={{ fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPartner?.vat || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '12px' }}>Phone Number</label>
                      <div style={{ height: '42px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 12px', borderRadius: '12px', border: '1px solid #d7dee8', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {selectedPartner?.phone || selectedPartner?.mobile || (isMobile ? '-' : 'No phone number')}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '12px' }}>GSTIN</label>
                      <div style={{ height: '42px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 12px', borderRadius: '12px', border: '1px solid #d7dee8', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {selectedPartner?.vat || 'No GST provided'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Full Address */}
            {selectedPartner && (
              <div className="form-group" style={{ marginTop: isMobile ? '0.5rem' : '1rem' }}>
                 <label style={{ fontSize: isMobile ? '11px' : '12px' }}>Full Address</label>
                 <div style={isMobile ? { fontSize: '13px', fontStyle: 'italic', color: '#64748b', padding: '0 4px', lineHeight: 1.4 } : { background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #d7dee8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   {!isMobile && <MapPin size={16} className="text-blue-500" style={{ flexShrink: 0 }} />}
                   <span style={isMobile ? {} : { color: '#334155', fontWeight: 500 }}>
                     {[selectedPartner.street, selectedPartner.street2, selectedPartner.city, selectedPartner.state_name || (selectedPartner.state_id ? selectedPartner.state_id[1] : null), selectedPartner.zip].filter(Boolean).join(', ') || 'No address provided'}
                   </span>
                 </div>
              </div>
            )}

            {/* Row 3: Professionals */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: isMobile ? '0.75rem' : '1.25rem', marginTop: isMobile ? '0.65rem' : '1.25rem' }}>
              <div className="form-group" style={isMobile ? { marginBottom: 0, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fcfcfd' } : { marginBottom: 0 }}>
                <label style={{ margin: 0, fontSize: isMobile ? '10px' : '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Architect</label>
                <div style={isMobile ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '2px 0' } : { height: '42px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0 12px', borderRadius: '12px', border: '1px solid #d7dee8', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  <span style={{ fontSize: isMobile ? '13px' : '13px', fontWeight: isMobile ? 700 : 600, color: isMobile ? '#334155' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedArchitect?.name || selectedPartner?.architect_name || (orderHeader.architectId ? 'Architect Selected' : (isMobile ? '-' : 'No Architect assigned'))}
                  </span>
                  {(selectedArchitect?.phone || selectedPartner?.architect_phone) && (
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <Phone size={12} className="text-blue-500" />
                      {selectedArchitect?.phone || selectedPartner.architect_phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group" style={isMobile ? { marginBottom: 0, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fcfcfd' } : { marginBottom: 0 }}>
                <label style={{ margin: 0, fontSize: isMobile ? '10px' : '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Electrician</label>
                <div style={isMobile ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '2px 0' } : { height: '42px', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0 12px', borderRadius: '12px', border: '1px solid #d7dee8', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  <span style={{ fontSize: isMobile ? '13px' : '13px', fontWeight: isMobile ? 700 : 600, color: isMobile ? '#334155' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedElectrician?.name || selectedPartner?.electrician_name || (orderHeader.electricianId ? 'Electrician Selected' : (isMobile ? '-' : 'No Electrician assigned'))}
                  </span>
                  {(selectedElectrician?.phone || selectedPartner?.electrician_phone) && (
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <Phone size={12} className="text-blue-500" />
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
            <div className="co-card-body product-cards-list" style={{ paddingTop: '0.75rem' }}>
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
                        gridTemplateColumns: `minmax(300px, 1fr) 210px ${orderHeader.is_image ? '80px' : ''} ${orderHeader.is_beam ? '80px' : ''} 40px`.trim().replace(/\s+/g, ' '),
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Product</div>
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
                    {rows.map((r, idx) => {
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
                          className={`product-item-card product-row ${r.display_type === 'line_section' ? 'is-section-row' : ''}`} 
                          style={{ 
                            position: 'relative',
                            padding: isMobile ? '1.25rem 1rem' : '0.25rem 0.5rem', 
                            border: isMobile ? '1px solid #e2e8f0' : 'none', 
                            borderLeft: isMobile ? 'none' : 'none',
                            borderRight: isMobile ? 'none' : 'none',
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
                          <div className="drag-handle" style={{ cursor: 'grab', color: '#cbd5e1', padding: '4px 2px' }}>
                            <GripVertical size={16} />
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isMobile && (
                              <button 
                                className="pi-remove" 
                                onClick={() => setRows(prev => prev.filter(row => row.id !== r.id))} 
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
                                  : isMobile ? 'none' : `minmax(300px, 1fr) 210px ${orderHeader.is_image ? '80px' : ''} ${orderHeader.is_beam ? '80px' : ''} 40px`.trim().replace(/\s+/g, ' '),
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
                                               options={masterData.products
                                                 .filter(p => orderHeader.is_automate ? true : !p.is_automation)
                                                 .map(p => ({ value: p.id, label: p.name }))}
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
                                     overflow: 'hidden'
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
                                      onClick={() => setRows(prev => prev.filter(row => row.id !== r.id))}
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
                    })}
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

        {/* Schedule Activity Section */}
        <div className="co-expandable-card activity-schedule-card" style={{ marginBottom: '1.25rem' }}>
          <div className="co-expand-header" onClick={() => setShowActivitySection(!showActivitySection)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="co-card-icon-pill" style={{ backgroundColor: '#f0f9ff', color: '#0ea5e9' }}>
                <Calendar size={18} />
              </div>
              <div className="co-card-title-stack">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Tasks</h2>
              </div>
            </div>
            <div className={`co-chevron ${showActivitySection ? 'open' : ''}`}>
              <ChevronRight size={18} />
            </div>
          </div>

          {showActivitySection && (
            <div className="co-card-body" style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
              {/* Form Grid: Due Date and Assigned To side-by-side */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Due Date</label>
                  <input 
                    type="date" 
                    className="co-input-border"
                    value={newActivity.date_deadline} 
                    onChange={e => setNewActivity(prev => ({ ...prev, date_deadline: e.target.value }))}
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Assigned To</label>
                  <SearchableSelect
                    placeholder="Select User"
                    value={newActivity.user_id}
                    onChange={(val) => setNewActivity(prev => ({ ...prev, user_id: val }))}
                    options={masterData.users?.map(u => ({ value: u.id, label: u.name }))}
                  />
                </div>
              </div>

              {/* Note Section */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Activity Note</label>
                <textarea 
                  className="co-textarea"
                  value={newActivity.note} 
                  onChange={e => setNewActivity(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Type details here... (Press Enter for new line)"
                  style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', lineHeight: '1.5' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    // Auto-pick To Do type if not set
                    let typeId = newActivity.activity_type_id;
                    if (!typeId && masterData.activity_types) {
                       const todoType = masterData.activity_types.find(t => t.name.toLowerCase().includes('todo') || t.name.toLowerCase().includes('to do')) || masterData.activity_types[0];
                       typeId = todoType?.id;
                    }
                    if (!typeId) return alert("Select activity type");
                    
                    setScheduledActivities(prev => [...prev, { ...newActivity, activity_type_id: typeId, id: Date.now() }]);
                    setNewActivity({
                      activity_type_id: '',
                      summary: 'To Do',
                      note: '',
                      user_id: '',
                      date_deadline: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="co-btn-primary"
                  style={{ padding: '0 24px', height: '42px', borderRadius: '10px' }}
                >
                  <Plus size={18} style={{ marginRight: '8px' }} />
                  Add Activity
                </button>
              </div>

              {/* List of planned activities */}
              {scheduledActivities.length > 0 && (
                <div className="planned-activities" style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Planned Activities</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {scheduledActivities.map(act => {
                      const typeName = masterData.activity_types?.find(t => t.id === act.activity_type_id)?.name || 'Activity';
                      const userName = masterData.users?.find(u => u.id === parseInt(act.user_id))?.name || 'Self';
                      return (
                        <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', marginTop: '2px' }}>
                              <Clock size={16} className="text-blue-500" />
                            </div>
                            <div>
                              {editingTaskId === act.id ? (
                                <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f6', marginTop: '4px' }}>
                                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                      <select 
                                        className="co-select-v2" 
                                        value={taskEditText.activity_type_id}
                                        onChange={e => setTaskEditText({...taskEditText, activity_type_id: parseInt(e.target.value)})}
                                        style={{ height: '32px', fontSize: '12px', padding: '0 4px' }}
                                      >
                                        {(masterData.activity_types || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                      <input 
                                        type="date" 
                                        className="co-input-v2" 
                                        value={taskEditText.date_deadline} 
                                        onChange={e => setTaskEditText({...taskEditText, date_deadline: e.target.value})}
                                        style={{ height: '32px', fontSize: '12px', padding: '0 4px' }}
                                      />
                                   </div>
                                   <input 
                                      className="co-input-v2" 
                                      value={taskEditText.summary} 
                                      onChange={e => setTaskEditText({...taskEditText, summary: e.target.value})}
                                      placeholder="Summary"
                                      style={{ height: '32px', fontSize: '12px', padding: '0 4px', width: '100%', marginBottom: '8px' }}
                                   />
                                   <textarea 
                                      className="co-textarea" 
                                      value={taskEditText.note} 
                                      onChange={e => setTaskEditText({...taskEditText, note: e.target.value})}
                                      placeholder="Add Notes..."
                                      style={{ minHeight: '60px', fontSize: '12px', padding: '8px', width: '100%', marginBottom: '8px' }}
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
            </div>
          )}
        </div>

        <div className="co-expandable-card main-notes-card">
          <div className="co-expand-header" onClick={() => setShowNotes(!showNotes)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="co-card-icon-pill" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <Send size={18} />
              </div>
              <div className="co-card-title-stack">
                <h2>Notes</h2>
              </div>
            </div>
            <div className={`co-chevron ${showNotes ? 'open' : ''}`}>
              <ChevronRight size={18} />
            </div>
          </div>
          
          {showNotes && (
            <div className="co-card-body">
              <div className="gn-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {generalNotes.map(note => (
                  <div key={note.id} className="gn-note-card" style={{ 
                    background: '#fff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px', 
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
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
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{note.by}</span>
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
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="activity-section">
          <div className="activity-toggle-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', marginBottom: '0.5rem' }}>
             <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                <input type="checkbox" checked={showCategories} onChange={() => setShowCategories(!showCategories)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showCategories ? '#3b82f6' : '#cbd5e1', transition: '.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: showCategories ? '20px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                </span>
             </label>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Show Product Selections</span>
          </div>

          {(() => {
            const getIcon = (type) => {
              switch(type) {
                case 'switches': return <ToggleRight size={20} />;
                case 'fans': return <Wind size={20} />;
                case 'ac': return <Activity size={20} />;
                case 'curtains': return <Layers size={20} />;
                case 'automation': return <Zap size={20} />;
                case 'lights': return <Lightbulb size={20} />;
                case 'profiles': return <Layers size={20} />;
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
                <div className="activity-header" onClick={() => setShowMore(showMore === act.id ? null : act.id)}>
                  <div className="activity-title-group">
                    <span className="activity-icon">{act.icon}</span>
                    <span className="activity-label">{act.title}</span>
                  </div>
                  <div className="activity-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddActivityNote(act.id);
                        if(showMore !== act.id) setShowMore(act.id);
                      }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Add note to this section"
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <Plus size={16} />
                    </button>
                    <ChevronDown size={18} className={showMore === act.id ? 'rotate-180' : ''} />
                  </div>
                </div>
                {showMore === act.id && (
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
                        >
                          <Paperclip size={20} />
                          <span className="upload-text">
                            {dragActiveId === act.id ? 'Drop images here' : 'Upload Images'}
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

        <div className="co-page-footer">
          <button className="co-btn co-btn-primary co-btn-lg" onClick={handleProcess}>
            {loading ? "Processing..." : (
              editId 
                ? (isSelection ? "Update Selection" : (isOrder ? "Update Order" : "Update Quotation"))
                : (isSelection ? "Create Selection" : (isOrder ? "Create Order" : "Submit Quotation"))
            )}
          </button>
          <button className="co-btn co-btn-secondary co-btn-lg" onClick={() => safeNavigate(isSelection ? 'selection' : isOrder ? 'orders' : 'quotations')}>
            Cancel
          </button>
        </div>
      </div> 
    </div>
  );
};

export default CreateOrder;
