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
      const [statsRes, salesRes] = await Promise.all([
        odooService.getStats(),
        odooService.getOrders(5)
      ]);
      setStats(statsRes);
      setRecentSales(salesRes.orders || []);
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
    <div className="dashboard-loader-container">
      <div className="dashboard-loader-spinner">
        <RefreshCcw className="animate-spin" size={40} color="#3b82f6" />
      </div>
      <p className="loader-text">Syncing your dashboard...</p>
    </div>
  );

  return (
    <div className="dashboard-page content-container">
      {/* Premium Header Banner */}
      <div className="dashboard-hero-banner mb-8">
        <div className="hero-content">
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
            Welcome back, {user?.name || 'User'}! 👋
          </h1>
          <p style={{ color: '#e0f2fe', fontSize: '1.125rem', fontWeight: 500, opacity: 0.9, margin: 0 }}>
            Here's your business overview at {user?.company || 'Amy Lights'}. Let's make today productive.
          </p>
        </div>
        <div className="hero-decoration"></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card clickable-card premium-card-1" onClick={() => onNavigate('quotations')}>
          <div className="stat-icon-wrapper">
            <ShoppingCart size={28} className="icon-main" />
          </div>
          <div className="stat-data">
            <p>Quotations</p>
            <h3>{stats?.quotation_count || 0}</h3>
          </div>
          <div className="card-decoration"></div>
        </div>
        <div className="stat-card clickable-card premium-card-2" onClick={() => onNavigate('orders')}>
          <div className="stat-icon-wrapper">
            <ShoppingBag size={28} className="icon-main" />
          </div>
          <div className="stat-data">
            <p>Sales Orders</p>
            <h3>{stats?.order_count || 0}</h3>
          </div>
          <div className="card-decoration"></div>
        </div>
        <div className="stat-card clickable-card premium-card-3" onClick={() => onNavigate('products')}>
          <div className="stat-icon-wrapper">
            <Box size={28} className="icon-main" />
          </div>
          <div className="stat-data">
            <p>Products</p>
            <h3>{stats?.product_count || 0}</h3>
          </div>
          <div className="card-decoration"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
