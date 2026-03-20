import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';
import OrderDetail from './pages/OrderDetail';
import ProductDetail from './pages/ProductDetail';
import { odooService } from './services/odoo';
import CreateOrder from './CreateOrder';
import CreateCustomer from './pages/CreateCustomer';
import CreateProductPage from './pages/CreateProductPage';
import './App.css';

const LOGIN_SESSION_KEY = 'amyLightsLoginSession';
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  ));

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

  const handleNavigate = (tab, id = null) => {
    setActiveTab(tab);
    setSelectedId(id);
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
    } catch {
      alert('Network error connecting to Odoo');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} loading={loading} />;
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
      case 'purchase_orders':
        return <PurchaseOrders onNavigate={handleNavigate} />;
      case 'order-detail':
        return <OrderDetail orderId={selectedId} onBack={() => handleNavigate('orders')} onNavigate={handleNavigate} />;
      case 'product-detail':
        return <ProductDetail productId={selectedId} onBack={() => handleNavigate('products')} />;
      case 'create-order':
        return <CreateOrder editId={selectedId} onNavigate={handleNavigate} />;
      case 'create-customer':
        return <CreateCustomer onNavigate={handleNavigate} />;
      case 'create-product':
        return <CreateProductPage onNavigate={handleNavigate} />;
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
    <div className={`app-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={handleNavigate}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
      />
      
      <main className="main-content">
        <Header
          user={user}
          title={activeTab}
          onLogout={handleLogout}
          onMenuToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <div className="page-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
