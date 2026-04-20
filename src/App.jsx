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
import Customers from './pages/Customers';
import CRM from './pages/CRM';
import CRMDetail from './pages/CRMDetail';
import CreateCRM from './pages/CreateCRM';
import CustomerDetail from './pages/CustomerDetail';
import Catalog from './pages/Catalog';
import { Menu } from 'lucide-react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [navHistory, setNavHistory] = useState(() => {
    try {
      const stored = sessionStorage.getItem('amy_nav_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

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

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
        setSelectedId(event.state.id);
        setExtraData(event.state.data);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (tab, id = null, data = null) => {
    if (tab !== activeTab || id !== selectedId) {
      setNavHistory(prev => {
        const next = [...prev, { tab: activeTab, id: selectedId, data: extraData }];
        sessionStorage.setItem('amy_nav_history', JSON.stringify(next));
        return next;
      });
    }
    setActiveTab(tab);
    setSelectedId(id);
    setExtraData(data);
    localStorage.setItem('amy_active_tab', tab);
    if (id) localStorage.setItem('amy_selected_id', id);
    else localStorage.removeItem('amy_selected_id');

    // Push to history
    window.history.pushState({ tab, id, data }, '', '');

    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleBack = (defaultTab) => {
    if (navHistory.length > 0) {
      const newHistory = [...navHistory];
      const prev = newHistory.pop();
      setNavHistory(newHistory);
      sessionStorage.setItem('amy_nav_history', JSON.stringify(newHistory));
      
      setActiveTab(prev.tab);
      setSelectedId(prev.id);
      setExtraData(prev.data);
      
      localStorage.setItem('amy_active_tab', prev.tab);
      if (prev.id) localStorage.setItem('amy_selected_id', prev.id);
      else localStorage.removeItem('amy_selected_id');
      
      window.history.pushState({ tab: prev.tab, id: prev.id, data: prev.data }, '', '');
    } else {
      handleNavigate(defaultTab);
    }
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => !prev);
    }
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
      case 'all-orders':
        return <Orders stateType="all" onNavigate={handleNavigate} />;
      case 'tasks':
        return <Orders stateType="all" isTaskView={true} onNavigate={handleNavigate} />;
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
      case 'crm':
        return <CRM onNavigate={handleNavigate} />;
      case 'order-detail':
        return <OrderDetail orderId={selectedId} onBack={() => handleBack('quotations')} onNavigate={handleNavigate} />;
      case 'product-detail':
        return <ProductDetail productId={selectedId} onBack={() => handleBack('products')} />;
      case 'create-order':
        return <CreateOrder editId={selectedId} onNavigate={handleNavigate} extraData={extraData} onBack={() => handleBack('quotations')} />;
      case 'create-direct-order':
        return <CreateOrder editId={selectedId} isOrder={true} onNavigate={handleNavigate} extraData={extraData} onBack={() => handleBack('orders')} />;
      case 'create-selection':
        return <CreateOrder editId={selectedId} isSelection={true} onNavigate={handleNavigate} extraData={extraData} onBack={() => handleBack('selection')} />;
      case 'create-customer':
        return <CreateCustomer editId={selectedId} onNavigate={handleNavigate} extraData={extraData} onBack={() => handleBack('customers')} />;
      case 'create-product':
        return <CreateProductPage onNavigate={handleNavigate} onBack={() => handleBack('products')} />;
      case 'catalog':
        return <Catalog onNavigate={handleNavigate} partnerId={selectedId} extraData={extraData} onBack={() => handleBack('dashboard')} />;
      case 'crm-detail':
        return <CRMDetail leadId={selectedId} onBack={() => handleBack('crm')} onNavigate={handleNavigate} />;
      case 'create-crm':
        return <CreateCRM editId={selectedId} onNavigate={handleNavigate} extraData={extraData} onBack={() => handleBack('crm')} />;
      case 'customer-detail':
        return <CustomerDetail partnerId={selectedId} onBack={() => handleBack('customers')} onNavigate={handleNavigate} />;
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
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <Sidebar 
        user={user}
        companyInfo={companyInfo}
        isOpen={isSidebarOpen} 
        isCollapsed={isSidebarCollapsed}
        activeTab={activeTab} 
        onTabChange={handleNavigate} 
        onLogout={handleLogout}
        onCloseSidebar={() => setIsSidebarOpen(false)} 
      />
      
      <div className="main-content">
        {/* Topbar with Hamburger */}
        <header className="top-hamburger-bar">
          <button 
            className="hamburger-btn"
            onClick={toggleSidebar}
            aria-label="Toggle Menu"
          >
            <Menu size={22} />
          </button>
          <div className="topbar-context">
            <span className="current-tab-name">
              {(() => {
                const isEdit = !!selectedId;
                switch (activeTab) {
                  case 'dashboard': return 'Dashboard';
                  case 'products': return 'Products';
                  case 'all-orders': return 'All Orders';
                  case 'tasks': return 'Tasks';
                  case 'quotations': return 'Quotations';
                  case 'orders': return 'Sales Orders';
                  case 'selection': return 'Selections';
                  case 'cancelled': return 'Cancelled Orders';
                  case 'customers': return 'Customers';
                  case 'crm': return 'Lead CRM';
                  case 'order-detail': return 'Order Details';
                  case 'product-detail': return 'Product Details';
                  case 'create-order': return isEdit ? 'Edit Quotation' : 'Create Quotation';
                  case 'create-direct-order': return isEdit ? 'Edit Order' : 'Create Order';
                  case 'create-selection': return isEdit ? 'Edit Selection' : 'Create Selection';
                  case 'create-customer': return isEdit ? 'Edit Customer' : 'Create Customer';
                  case 'create-product': return 'Create Product';
                  case 'catalog': return 'Product Catalog';
                  case 'crm-detail': return 'Lead CRM Detail';
                  case 'create-crm': return isEdit ? 'Edit CRM Lead' : 'Create CRM Lead';
                  default: return activeTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }
              })()}
            </span>
          </div>
        </header>

        <div className="page-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
