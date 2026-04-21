import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  User, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Phone,
  MessageSquare
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import './Orders.css';

const TodoList = ({ onNavigate }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, today, overdue, planned

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      // Fetching orders using a valid sort field (date_order)
      const data = await odooService.getOrders(1000, 0, 'id desc', 'all');
      const ordersWithActivities = (data.orders || []).filter(o => o.activity_date);
      // Sort in frontend since activity_date is a calculated field
      ordersWithActivities.sort((a, b) => a.activity_date.localeCompare(b.activity_date));
      setTodos(ordersWithActivities);
    } catch (err) {
      console.error("Failed to fetch todos", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = todos.filter(t => {
    const matchesSearch = !searchTerm || 
      String(t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(t.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.last_activity || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'today') return t.activity_date === todayStr;
    if (filterType === 'overdue') return t.activity_date < todayStr;
    if (filterType === 'planned') return t.activity_date > todayStr;
    
    return true;
  });

  const getStatusColor = (date) => {
    if (!date) return '#94a3b8';
    if (date < todayStr) return '#ef4444';
    if (date === todayStr) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="todo-page dt-page" style={{ padding: '1rem' }}>
      <div className="dt-card" style={{ background: 'transparent', boxShadow: 'none' }}>
        <div className="dt-header" style={{ background: '#fff', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#eef2ff', padding: '10px', borderRadius: '12px', color: '#4f46e5' }}>
                <CheckSquare size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Daily To-Do List</h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Manage your pending activities and follow-ups</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {['all', 'today', 'overdue'].map(type => (
                <button 
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{ 
                    padding: '6px 16px', 
                    fontSize: '13px', 
                    fontWeight: 600,
                    borderRadius: '8px', 
                    border: 'none',
                    cursor: 'pointer',
                    background: filterType === type ? '#fff' : 'transparent', 
                    color: filterType === type ? '#4f46e5' : '#64748b',
                    boxShadow: filterType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    textTransform: 'capitalize'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by customer, order ID or activity description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', background: '#fcfdfe' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center">
            <Loader message="Gathering your tasks..." />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ background: '#f0fdf4', color: '#16a34a', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>You're all caught up!</h3>
            <p style={{ color: '#64748b', maxWidth: '300px', margin: '0 auto' }}>No tasks found for your current filter. Enjoy your productive day!</p>
          </div>
        ) : (
          <div className="todo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(item => (
              <div 
                key={item.id} 
                onClick={() => onNavigate('order-detail', item.id)}
                style={{ 
                  background: '#fff', 
                  borderRadius: '20px', 
                  padding: '1.25rem', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)', 
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: getStatusColor(item.activity_date) }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '20px' }}>
                    <Calendar size={13} className="text-slate-400" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: getStatusColor(item.activity_date) }}>
                      {item.activity_date === todayStr ? 'TODAY' : item.activity_date}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>#{item.name}</span>
                </div>

                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>
                  {item.last_activity || 'Follow-up on Order'}
                </h3>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={16} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.customer || 'Unknown Client'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.salesperson || 'Unassigned'}</div>
                      </div>
                      {item.phone && (
                        <a 
                          href={`tel:${item.phone}`} 
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}
                        >
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;
