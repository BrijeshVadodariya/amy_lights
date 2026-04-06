import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import OrderDetail from './pages/OrderDetail';
import ProductDetail from './pages/ProductDetail';
import { getOdooErrorMessage, odooService } from './services/odoo';
import CreateOrder from './CreateOrder';
import CreateCustomer from './pages/CreateCustomer';
import CreateProductPage from './pages/CreateProductPage';
import Catalog from './pages/Catalog';
import Customers from './pages/Customers';
import './App.css';

const LOGIN_SESSION_KEY = 'amyLightsLoginSession';
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('amy_active_tab') || 'dashboard');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('amy_selected_id') || null);
  const [extraData, setExtraData] = useState(null); // New state for extra data
  const [companyInfo, setCompanyInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  ));

  const fetchCompanyInfo = async () => {
    try {
      const res = await odooService.getCompanyInfo();
      if (res.success && res.data) {
        setCompanyInfo(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch company info", err);
    }
  };

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const storedSession = localStorage.getItem(LOGIN_SESSION_KEY);
    if (!storedSession) return;

    try {
      const session = JSON.parse(storedSession);
      const isExpired = !session?.expiresAt || Date.now() > session.expiresAt;

      if (isExpired) {
        localStorage.removeItem(LOGIN_SESSION_KEY);
        return;
      }

      setUser(session.user || null);
      setIsLoggedIn(true);
    } catch {
      localStorage.removeItem(LOGIN_SESSION_KEY);
    }
  }, []);

  const handleNavigate = (tab, id = null, data = null) => {
    setActiveTab(tab);
    setSelectedId(id);
    setExtraData(data); // Set extra data
    localStorage.setItem('amy_active_tab', tab);
    if (id) localStorage.setItem('amy_selected_id', id);
    else localStorage.removeItem('amy_selected_id');

    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleLogin = async (credentials) => {
    setLoading(true);
    try {
      const res = await odooService.login(credentials.email, credentials.password);
      if (res.success) {
        setUser(res.data);
        setIsLoggedIn(true);
        localStorage.setItem(
          LOGIN_SESSION_KEY,
          JSON.stringify({
            user: res.data,
            expiresAt: Date.now() + ONE_DAY_IN_MS,
          })
        );
      } else {
        alert(res.error?.message || 'Invalid credentials');
      }
    } catch (error) {
      alert(getOdooErrorMessage(error, 'Network error connecting to Odoo'));
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} loading={loading} companyInfo={companyInfo} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'products':
        return <Products onNavigate={handleNavigate} />;
      case 'quotations':
        return <Orders stateType="quotation" onNavigate={handleNavigate} />;
      case 'orders':
        return <Orders stateType="order" onNavigate={handleNavigate} />;
      case 'selection':
        return <Orders stateType="selection" onNavigate={handleNavigate} />;
      case 'cancelled':
        return <Orders stateType="cancel" onNavigate={handleNavigate} />;
      case 'customers':
        return <Customers onNavigate={handleNavigate} />;
      case 'order-detail':
        return <OrderDetail orderId={selectedId} onBack={() => handleNavigate('quotations')} onNavigate={handleNavigate} />;
      case 'product-detail':
        return <ProductDetail productId={selectedId} onBack={() => handleNavigate('products')} />;
      case 'create-order':
        return <CreateOrder editId={selectedId} onNavigate={handleNavigate} extraData={extraData} />;
      case 'create-direct-order':
        return <CreateOrder editId={selectedId} isOrder={true} onNavigate={handleNavigate} extraData={extraData} />;
      case 'create-selection':
        return <CreateOrder editId={selectedId} isSelection={true} onNavigate={handleNavigate} extraData={extraData} />;
      case 'create-customer':
        return <CreateCustomer onNavigate={handleNavigate} extraData={extraData} />;
      case 'create-product':
        return <CreateProductPage onNavigate={handleNavigate} />;
      case 'catalog':
        return <Catalog onNavigate={handleNavigate} partnerId={selectedId} extraData={extraData} />;
      default:
        return <Dashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem(LOGIN_SESSION_KEY);
    odooService.logout().catch(() => {});
  };

  return (
    <div className="app-layout">
      <div className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <Sidebar 
        user={user}
        companyInfo={companyInfo}
        isOpen={isSidebarOpen} 
        activeTab={activeTab} 
        onTabChange={handleNavigate} 
        onLogout={handleLogout}
        onCloseSidebar={() => setIsSidebarOpen(false)} 
      />
      <div className="main-content">
        <Header 
          user={user} 
          companyInfo={companyInfo}
          title={activeTab} 
          onLogout={handleLogout} 
          onMenuToggle={toggleSidebar} 
          isSidebarOpen={isSidebarOpen} 
        />
        <div className="page-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
