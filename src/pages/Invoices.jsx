import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Search, Filter, RefreshCcw } from 'lucide-react';
import { odooService } from '../services/odoo';
import './Orders.css'; // Reusing Orders.css for consistent table styling

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const data = await odooService.getInvoices();
            setInvoices(data || []);
        } catch (err) {
            console.error("Failed to fetch invoices", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const filtered = invoices.filter(i => 
        i.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.customer?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="placeholder-content">
            <RefreshCcw className="animate-spin" size={32} />
            <p>Fetching Invoices...</p>
        </div>
    );

    return (
        <div className="orders-page content-container">
            <header className="orders-header mb-8">
                <div className="header-title-group">
                    <h1 className="text-3xl font-bold text-slate-800">Invoices</h1>
                    <p className="text-slate-500">Track your billing, payments, and financial history.</p>
                </div>
            </header>

            <div className="orders-controls mb-6">
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search invoices..." 
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-filter" onClick={fetchInvoices}>
                    <RefreshCcw size={18} />
                    <span>Refresh</span>
                </button>
            </div>

            <div className="orders-table-wrapper card">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Number</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Due Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((inv, idx) => (
                            <tr key={inv.id}>
                                <td>{idx + 1}</td>
                                <td><span className="font-semibold text-slate-700">{inv.name}</span></td>
                                <td>{inv.customer}</td>
                                <td>{inv.invoice_date}</td>
                                <td>{inv.due_date || '-'}</td>
                                <td className="font-medium text-slate-800">
                                    {inv.currency_symbol} {inv.amount_total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td>
                                    <span className={`status-pill status-${inv.status}`}>
                                        {inv.status === 'posted' ? 'Published' : inv.status}
                                    </span>
                                </td>
                                <td className="actions">
                                    <button className="icon-btn" title="View"><Eye size={16} /></button>
                                    <button className="icon-btn" title="Download"><Download size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="8" className="text-center p-12 text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <FileText size={48} className="mb-2 opacity-20" />
                                        <p>No invoices found matching your criteria.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Invoices;
