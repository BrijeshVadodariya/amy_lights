import React, { useState, useEffect } from 'react';
import { ShoppingCart, ShoppingBag, Box, Users, RefreshCcw, FileText, Eye } from 'lucide-react';
import { odooService } from '../services/odoo';
import './Dashboard.css';

const Dashboard = ({ user, onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes, purchaseRes] = await Promise.all([
        odooService.getStats(),
        odooService.getOrders(5),
        odooService.getPurchaseOrders(5)
      ]);
      setStats(statsRes);
      setRecentSales(salesRes.orders || []);
      setRecentPurchases(purchaseRes.orders || []);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return (
    <div className="placeholder-content">
      <RefreshCcw className="animate-spin" size={32} />
      <p>Syncing with Odoo...</p>
    </div>
  );

  return (
    <div className="dashboard-page content-container">
      <header className="dashboard-header mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Welcome, {user?.name || 'User'}!</h1>
        <p className="text-slate-500">Here's your business overview at {user?.company || 'Amy Lights'}.</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card clickable-card" onClick={() => onNavigate('quotations')}>
          <div className="stat-icon sales">
            <ShoppingCart size={24} />
          </div>
          <div className="stat-data">
            <p>Quotations</p>
            <h3>{stats?.quotation_count || 0}</h3>
          </div>
        </div>
        <div className="stat-card clickable-card" onClick={() => onNavigate('orders')}>
          <div className="stat-icon purchase">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-data">
            <p>Sales Orders</p>
            <h3>{stats?.order_count || 0}</h3>
          </div>
        </div>
        <div className="stat-card clickable-card" onClick={() => onNavigate('products')}>
          <div className="stat-icon success">
            <Box size={24} />
          </div>
          <div className="stat-data">
            <p>Products</p>
            <h3>{stats?.product_count || 0}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
