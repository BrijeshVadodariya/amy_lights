import React, { useState, useEffect } from 'react';
import { Users, Eye, Edit, Trash2, Search, Filter, RefreshCcw, Plus } from 'lucide-react';
import { odooService } from '../services/odoo';
import './Orders.css'; // Consistency

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const [masterRes, partnerRes] = await Promise.all([
                odooService.getMasterData().catch(() => null),
                odooService.getPartners().catch(() => null)
            ]);

            let allPartners = [];
            let architects = [];
            let electricians = [];

            if (masterRes) {
                allPartners = masterRes.partners || [];
                architects = masterRes.architects || [];
                electricians = masterRes.electricians || [];
                if (masterRes.data) {
                    allPartners = masterRes.data.partners || allPartners;
                    architects = masterRes.data.architects || architects;
                    electricians = masterRes.data.electricians || electricians;
                }
            }

            // Fallback for partners
            if (allPartners.length === 0 && partnerRes) {
                allPartners = Array.isArray(partnerRes) ? partnerRes : (partnerRes.partners || []);
            }

            const all = [
                ...(allPartners || []).map(p => ({ ...p, type: 'Company' })),
                ...(architects || []).map(a => ({ ...a, type: 'Architect' })),
                ...(electricians || []).map(e => ({ ...e, type: 'Electrician' }))
            ].reduce((acc, current) => {
                const existing = acc.find(item => item.id === current.id);
                if (!existing) acc.push(current);
                return acc;
            }, []);
            setPartners(all);
        } catch (err) {
            console.error("Failed to fetch Partners", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const filtered = partners.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="placeholder-content">
            <RefreshCcw className="animate-spin" size={32} />
            <p>Scanning Network Members...</p>
        </div>
    );

    return (
        <div className="orders-page content-container">
            <header className="orders-header mb-8">
                <div className="header-title-group">
                    <h1 className="text-3xl font-bold text-slate-800">Network Members</h1>
                    <p className="text-slate-500">Manage your companies, architects, and electricians in one place.</p>
                </div>
                <button className="btn-primary" onClick={() => {/* Future Add Partner */}}>
                    <Plus size={18} />
                    <span>New Member</span>
                </button>
            </header>

            <div className="orders-controls mb-6">
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by name..." 
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-filter" onClick={fetchPartners}>
                    <RefreshCcw size={18} />
                    <span>Refresh</span>
                </button>
            </div>

            <div className="orders-table-wrapper card">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p, idx) => (
                            <tr key={`${p.id}-${p.type}`}>
                                <td>{p.id}</td>
                                <td><strong>{p.name}</strong></td>
                                <td>
                                    <span className={`status-pill status-${p.type.toLowerCase()}`}>
                                        {p.type}
                                    </span>
                                </td>
                                <td>{p.email || '-'}</td>
                                <td>{p.phone || '-'}</td>
                                <td className="actions">
                                    <button className="icon-btn" title="View"><Eye size={16} /></button>
                                    <button className="icon-btn edit" title="Edit"><Edit size={16} /></button>
                                    <button className="icon-btn delete" title="Delete"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Partners;
