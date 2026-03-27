import React, { useState, useEffect } from 'react';
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
  Trash
} from 'lucide-react';
import './CreateOrder.css';

const createProductRow = () => ({
  id: Date.now(),
  productId: '',
  qty: 1,
  price: 0,
  discount: 0,
  remark: ''
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
  });

  const [orderHeader, setOrderHeader] = useState({
    partnerId: '',
    date: new Date().toISOString().split('T')[0],
    remark: '',
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
  const [noteEditText, setNoteEditText] = useState("");
  const [editingActivityNoteId, setEditingActivityNoteId] = useState(null);
  const [activityNoteEditText, setActivityNoteNoteEditText] = useState("");

  const [rows, setRows] = useState([
    createProductRow()
  ]);

  const [generalNotes, setGeneralNotes] = useState([]);
  const [generalNoteInput, setGeneralNoteInput] = useState('');
  const [deletedActivityIds, setDeletedActivityIds] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track changes to prompt user on exit
  useEffect(() => {
    const isDirty = rows.some(r => r.productId !== '' && r.productId !== null) || 
                   (orderHeader.partnerId !== '' && orderHeader.partnerId !== null) || 
                   generalNotes.length > 0;
    setHasChanges(isDirty);
  }, [rows, orderHeader, generalNotes]);

  const safeNavigate = (to) => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Navigating away will lose your data. Are you sure?")) {
        setHasChanges(false);
        onNavigate(to);
      }
    } else {
      onNavigate(to);
    }
  };

  const [activityInputs, setActivityInputs] = useState({});
  const [activityHistory, setActivityHistory] = useState({
    call: [],
    whatsapp: [],
    visit: [],
    email: []
  });
  useEffect(() => {
    if (extraData) {
      if (extraData.preFilledPartnerId) {
        setOrderHeader(prev => ({ ...prev, partnerId: extraData.preFilledPartnerId }));
      }
      if (extraData.preFilledProducts && extraData.preFilledProducts.length > 0) {
        setRows(extraData.preFilledProducts.map(p => ({
          id: Date.now() + Math.random(),
          productId: p.productId,
          qty: p.qty || 1,
          price: p.price || 0,
          discount: 0,
          remark: ''
        })));
      }
    }
  }, [extraData]);
  
  // The beforeunload handler is moved here for cleaner organization
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const [debugRawData, setDebugRawData] = useState(null);
  const [dragActiveId, setDragActiveId] = useState(null);

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
      id: Date.now(),
      text: input.text,
      images: input.images,
      by: 'CurrentUser',
      date: new Date().toLocaleString()
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

  // fetchMasterData and fetchEditOrder are managed below.

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
          const exists = masterData.partners.find(p => String(p.id) === String(pId));
          if (!exists) missingPartners.push({ id: pId, name: pName });
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
          is_automate: data.is_automate ?? false
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
            const combined = [...allTypeNotes];
            if (combined.length === 0 && data.remark) {
              // Strip HTML from fallback remark field too
              const cleanRemark = data.remark.replace(/<\/?[^>]+(>|$)/g, "").trim();
              if (cleanRemark) {
                combined.push({
                  id: 'existing-remark',
                  text: cleanRemark,
                  by: 'System',
                  date: 'Imported',
                  is_from_backend: true,
                  is_new: false
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
        
        const lineItems = data.lines || data.order_line || [];
        // Filtering out notes/sections to only show products
        const productLines = lineItems.filter(l => !l.display_type && (!!l.product_id || !!l.product_name));

        const mappedRows = productLines.map((l, i) => {
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
            // Carry over specs from lines to ensure they show even if product catalog is incomplete
            image_url: l.image_url || '',
            beam: l.beam || '-',
            description: l.description || l.remark || ''
          };
        });

        if (missingPartners.length > 0 || missingProducts.length > 0) {
          setMasterData(prev => ({
            ...prev,
            partners: [...prev.partners, ...missingPartners],
            products: [...prev.products, ...missingProducts]
          }));
        }

        // Set rows AFTER masterData update (ideally) but React batches these anyway
        setRows(mappedRows.length ? mappedRows : [createProductRow()]);
        setShowProducts(mappedRows.length > 0);
      }
    } catch (err) {
      console.error('Edit fetch failed', err);
    }
    finally { setLoading(false); }
  }, [editId]);

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
  }, [editId, fetchMasterData, fetchEditOrder]);

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        if (field === 'productId') {
          const parsedId = /^\d+$/.test(value) ? parseInt(value) : value;
          const prod = masterData.products.find(p => String(p.id) === String(parsedId));
          return { ...r, productId: value, price: prod ? prod.price : 0 };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const addRow = () => {
    setRows(prev => [...prev, createProductRow(prev.length)]);
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

    const productLines = rows.filter(r => r.productId !== '' && r.productId !== null && r.productId !== undefined);
    if (productLines.length === 0) {
        return alert("Please select at least one product before saving.");
    }

    setLoading(true);
    try {
      const finalProductLines = productLines.map((r, idx) => {
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
          line_type: 'product'
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

      // 1. Process Activity Notes (Selective commands for update/create/delete)
      // Historical or Edited notes
      Object.keys(activityHistory).forEach(type => {
        (activityHistory[type] || []).forEach(hNote => {
           if (typeof hNote.id === 'number') {
             // UPDATE Command (1, id, vals)
             amyNoteLines.push([1, hNote.id, {
               note_type: type,
               text: hNote.text || ''
             }]);
           } else {
             // fallback for safety (is_new handled below)
           }
        });
      });

      // Deletions 
      deletedActivityIds.forEach(delId => {
        amyNoteLines.push([2, delId, 0]); // DELETE Command
      });

      // New inputs being added
      Object.keys(activityInputs).forEach(type => {
        const input = activityInputs[type];
        if (input && (input.text || (input.images && input.images.length > 0))) {
          const images = (input.images || []).map(img => img.includes(',') ? img.split(',')[1] : null).filter(Boolean);
          // CREATE Command (0, 0, vals)
          amyNoteLines.push([0, 0, {
            note_type: type,
            text: input.text || '',
            image: images.map((img, i) => [0, 0, { datas: img, name: genName(type, i) }])
          }]);
        }
      });

      // 2. Consolidate ONLY current session's NEW general notes for the 'Remark' box
      // (Technical activity like 'Decorative' is now strictly saved to amy_note_ids only)
      const newGeneralNotes = generalNotes.filter(n => n.is_new).map(n => n.text).filter(Boolean).join('\n');
      
      chatterText = newGeneralNotes;
      
      // chatterNotes for message log
      const chatterNotes = generalNotes.filter(n => n.is_new).map(n => n.text).filter(Boolean);
      console.log("[Save Order] Focused chatter text length:", chatterText.length);
      console.log("[Save Order] Consolidated chatter text length:", chatterText.length);

      const ensureIsoDate = (dateVal) => {
        if (!dateVal) return null;
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateVal)) {
          const [d, m, y] = dateVal.split('-');
          return `${y}-${m}-${d}`;
        }
        return dateVal;
      };

      const finalExtraData = {
        architect_id: parseInt(orderHeader.architectId) || false,
        electrician_id: parseInt(orderHeader.electricianId) || false,
        remark: chatterText.trim() || orderHeader.remark || '', // Prioritize general notes for Remark box
        amy_note_lines: amyNoteLines,
        chatter_notes: chatterNotes,
        note: chatterText.trim() || '', 
        log_note: chatterText.trim() || '', 
        is_desc: !!orderHeader.is_desc,
        is_image: !!orderHeader.is_image,
        is_beam: !!orderHeader.is_beam,
        is_automate: !!orderHeader.is_automate,
        state: isSelection ? 'selection' : isOrder ? 'sale' : 'draft',
        date_order: ensureIsoDate(orderHeader.date)
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
        setHasChanges(false);
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

  const selectedPartner = masterData.partners.find(p => p.id === parseInt(orderHeader.partnerId));

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
            <button className="co-btn-icon" onClick={() => safeNavigate('create-customer')}>
              <Plus size={18} />
            </button>
          </div>
          <div className="co-card-body">
            <div className="form-group">
              <label>Select Customer *</label>
              <SearchableSelect
                placeholder="Choose a customer..."
                value={orderHeader.partnerId}
                defaultValue={orderHeader.partnerName} // Ensure label is visible on Edit
                onChange={(val) => setOrderHeader({ ...orderHeader, partnerId: val })}
                options={masterData.partners.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>

            {selectedPartner && (
              <div className="lead-body-simple" style={{ marginTop: '1.25rem' }}>
                <div className="lead-left">
                  <div className="lead-info-row">
                    <span className="lead-label">Customer Name</span>
                    <span className="lead-value-name">{selectedPartner.name}</span>
                  </div>
                  <div className="lead-info-row" style={{ marginTop: '0.5rem' }}>
                    <span className="lead-label">Contact No.</span>
                    <div className="lead-value contact-val">
                      <Phone size={14} className="text-blue-500" />
                      <span>{selectedPartner.phone || selectedPartner.mobile || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="lead-right">
                  <div className="lead-info-row address-row">
                    <span className="lead-label">Address</span>
                    <div className="lead-value address-val">
                      <MapPin size={14} className="text-blue-500" />
                      <span>{[selectedPartner.street, selectedPartner.city, selectedPartner.zip].filter(Boolean).join(', ') || 'No address provided'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            <div className="co-card-body product-cards-list">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
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
              </div>

              <div className="product-scroll-wrapper" style={{ overflowX: isMobile ? 'visible' : 'auto', paddingBottom: '1rem', marginTop: '1rem' }}>
                <div style={{ minWidth: isMobile ? '0' : 'max-content' }}>
                  {rows.length > 0 && !isMobile && (
                    <div className="product-list-header-row" style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderBottom: '2px solid #f8fafc', 
                        display: 'grid',
                        gridTemplateColumns: '400px 210px 80px 80px 40px',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Product</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Qty</div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Price</div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Disc</div>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{orderHeader.is_image ? 'Image' : ''}</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{orderHeader.is_beam ? 'Beam' : ''}</div>
                      <div />
                    </div>
                  )}

                  <div className="product-rows-container" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {rows.map((r) => {
                      const selectedProduct = masterData.products.find(p => String(p.id) === String(r.productId)) || {
                        id: r.productId,
                        name: r.productName,
                        beam: r.beam,
                        image_url: r.image_url,
                        description: r.description
                      };

                      return (
                        <div key={r.id} className="product-item-card" style={{ 
                          position: 'relative',
                          padding: isMobile ? '1.25rem' : '0 0.25rem', 
                          border: isMobile ? '1px solid #e2e8f0' : 'none', 
                          borderBottom: isMobile ? '1px solid #e2e8f0' : '1px solid #f1f5f9', 
                          borderRadius: isMobile ? '12px' : 0,
                          marginBottom: isMobile ? '1rem' : 0,
                          backgroundColor: '#fff',
                          boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.02)' : 'none'
                        }}>
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
                          <div className={isMobile ? "" : "pi-grid-row"} style={{ 
                            marginTop: 0, 
                            display: isMobile ? 'flex' : 'grid', 
                            gridTemplateColumns: isMobile ? 'none' : '400px 210px 80px 80px 40px',
                            alignItems: 'flex-start', 
                            gap: '8px', 
                            flexWrap: isMobile ? 'wrap' : 'nowrap' 
                          }}>
                             <div className="pi-main-info" style={{ width: isMobile ? '100%' : '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                                         className="co-search-select-mini"
                                       />
                                     </div>
                                     <button 
                                       onClick={() => onNavigate('create-product')}
                                       style={{ flex: '0 0 24px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
                                       title="Create New Product"
                                     >
                                       <Plus size={14} />
                                     </button>
                                   </div>
                                 </div>
                               </div>
                               {orderHeader.is_desc && selectedProduct?.id && selectedProduct.description && (
                                 <div className="pi-desc-box" style={{ padding: '0 8px 4px', fontSize: '11px', color: '#64748b', whiteSpace: 'pre-wrap', fontStyle: 'italic', lineHeight: '1.4' }}>
                                   {selectedProduct.description}
                                 </div>
                               )}
                             </div>
                            <div className="pi-sub-grid" style={{ width: isMobile ? '100%' : '100%', minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '1rem' : '4px', marginTop: isMobile ? '0.5rem' : '0' }}>
                              <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                                {isMobile && <label className="pi-small-label">Qty</label>}
                                <input type="number" className="co-input-border" value={r.qty} onChange={(e) => handleRowChange(r.id, 'qty', e.target.value)} style={{ width: '100%', height: '28px', fontSize: '12px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: 0 }} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                                {isMobile && <label className="pi-small-label">Price</label>}
                                <input type="number" className="co-input-border" value={r.price} onChange={(e) => handleRowChange(r.id, 'price', e.target.value)} style={{ width: '100%', height: '28px', fontSize: '12px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: 0 }} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
                                {isMobile && <label className="pi-small-label">Disc%</label>}
                                <input type="number" className="co-input-border" value={r.discount} onChange={(e) => handleRowChange(r.id, 'discount', e.target.value)} style={{ width: '100%', height: '28px', fontSize: '12px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: 0 }} />
                              </div>
                            </div>

                             <div style={{ 
                               display: (isMobile && !orderHeader.is_image) ? 'none' : 'flex',
                               visibility: orderHeader.is_image ? 'visible' : 'hidden', 
                               justifyContent: 'center',
                               minWidth: 0,
                               overflow: 'hidden'
                             }}>
                               <div className="h-[54px] w-[54px] bg-slate-50 border border-slate-100 rounded overflow-hidden relative">
                                 {selectedProduct?.id && (
                                   <img 
                                     src={(() => {
                                       const token = localStorage.getItem('odoo_session_id') || '';
                                       const db = import.meta.env.VITE_ODOO_DB || 'stage';
                                       let path = selectedProduct.image_url;
                                       if (!path) path = `/web/image/product.template/${selectedProduct.id}/image_128`;
                                       return `${path}${path.includes('?') ? '&' : '?'}token=${token}&db=${db}`;
                                     })()} 
                                     alt="p" className="h-full w-full object-contain"
                                     onError={(e) => { e.target.style.display='none'; }}
                                   />
                                 )}
                               </div>
                             </div>

                             <div style={{ 
                               display: (isMobile && !orderHeader.is_beam) ? 'none' : 'block',
                               visibility: orderHeader.is_beam ? 'visible' : 'hidden', 
                               fontSize: '11px', 
                               color: '#475569', 
                               textAlign: 'center', 
                               whiteSpace: 'nowrap', 
                               overflow: 'hidden', 
                               textOverflow: 'ellipsis', 
                               paddingTop: '8px' 
                             }}>
                               {selectedProduct?.beam || '-'}
                             </div>

                             {!isMobile && (
                               <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                                 <button 
                                   className="pi-remove-row" 
                                   onClick={() => setRows(prev => prev.filter(row => row.id !== r.id))}
                                   style={{ padding: '6px', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                   title="Delete Row"
                                 >
                                   <Trash size={16} />
                                 </button>
                               </div>
                             )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button className="co-btn-secondary w-full py-3" onClick={addRow} style={{ marginTop: '0.5rem' }}>
                <Plus size={18} style={{ marginRight: '8px' }} />
                Add Product Row
              </button>
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
              <div className="general-notes-list">
                {generalNotes.map(note => (
                  <div key={note.id} className="general-note-item">
                    <div className="gn-avatar-wrapper">
                      <div className="gn-avatar">{note.by.substring(0,2).toUpperCase()}</div>
                    </div>
                    <div className="gn-content">
                      {editingNoteId === note.id ? (
                        <div className="gn-edit-mode">
                          <textarea className="co-textarea" value={noteEditText} onChange={e => setNoteEditText(e.target.value)} />
                          <div className="gn-edit-actions" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button className="co-btn-text text-blue-600" onClick={() => saveEditNote(note.id)}>Save</button>
                            <button className="co-btn-text text-slate-500" onClick={() => setEditingNoteId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="gn-text">{note.text}</p>
                      )}
                      {note.images && note.images.length > 0 && (
                        <div className="gn-images-preview" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {note.images.map((img, i) => (
                            <div key={i} className="gn-img-item" style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img src={img} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="gn-meta">
                        <div className="gn-bottom">
                          <span className="gn-by">By {note.by}</span>
                          <span className="gn-date">{note.date}</span>
                        </div>
                        <div className="gn-item-actions" style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditNote(note.id, note.text)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }} title="Edit Note">
                            <Pencil size={14} className="text-slate-400 hover:text-blue-500" />
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }} title="Delete Note">
                            <Trash size={14} className="text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="gn-input-wrapper" style={{ marginTop: '1rem' }}>
                <input type="text" placeholder="Add Note" className="gn-input" value={generalNoteInput} onChange={e => setGeneralNoteInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddGeneralNote()} style={{ border: '1px solid #e2e8f0', padding: '8px 40px 8px 12px', borderRadius: '8px', width: '100%' }} />
                <Send size={18} className="gn-send-icon" onClick={handleAddGeneralNote} />
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
                case 'tasks': return <CheckSquare size={20} />;
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
            if (!displayActs.find(a => a.id === 'tasks')) {
                displayActs.push({ id: 'tasks', title: 'Tasks', icon: getIcon('tasks'), group: 'always' });
            }

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
                    <Plus size={16} />
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
                              <div className="note-actions" style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => handleEditActivityNote(act.id, note.id, note.text)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}>
                                  <Pencil size={14} className="text-slate-300 hover:text-blue-500" />
                                </button>
                                <button onClick={() => handleDeleteActivityNote(act.id, note.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}>
                                  <Trash size={14} className="text-slate-300 hover:text-red-500" />
                                </button>
                              </div>
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
            {loading ? "Processing..." : (editId ? (isSelection ? "Update Selection" : "Update Target") : (isSelection ? "Create Selection" : isOrder ? "Create Order" : "Submit Quotation"))}
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
