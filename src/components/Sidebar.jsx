import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Box, 
  ShoppingCart, 
  ShoppingBag, 
  LogOut,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  FileText,
  Clock,
  Users,
  XCircle,
  Target,
  X,
  Package,
  CheckCircle2
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ user, companyInfo, activeTab, onTabChange, onLogout, isOpen, onCloseSidebar, isCollapsed }) => {
  const [isSaleOrderOpen, setIsSaleOrderOpen] = useState(true);
  const [openSubmenuId, setOpenSubmenuId] = useState(null);

  // Check if we are in mobile view to show the X button
  const isMobile = window.innerWidth <= 768;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Box },
    { 
      id: 'sale-order-group', 
      label: 'Sale Order', 
      icon: ShoppingCart,
      isGroup: true,
      children: [
        { id: 'all-orders', label: 'All Orders', icon: FileText },
        { 
          id: 'tasks', 
          label: 'Tasks', 
          icon: Clock,
          children: [
            { id: 'tasks-pending', label: 'Pending', icon: Package },
            { id: 'tasks-completed', label: 'Completed', icon: CheckCircle2 }
          ]
        },
        { id: 'selection', label: 'Selection', icon: Box },
        { id: 'quotations', label: 'Quotation', icon: Clock },
        { 
          id: 'orders', 
          label: 'Orders', 
          icon: FileText,
          children: [
            { id: 'pending-orders', label: 'Pending', icon: Package },
            { id: 'completed-orders', label: 'Completed', icon: CheckCircle2 }
          ]
        },
        { id: 'cancelled', label: 'Cancelled', icon: XCircle }
      ]
    },
    { id: 'crm', label: 'CRM', icon: Target },
    { id: 'todo', label: 'To-Do', icon: CheckSquare },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    ...(user?.is_parent_dealer ? [{ id: 'team', label: 'Team', icon: Users }] : []),
  ];

  const handleTabClick = (itemOrId) => {
    const item = typeof itemOrId === 'string'
      ? menuItems.find((m) => m.id === itemOrId) || { id: itemOrId }
      : itemOrId;
    if (item.disabled) return;
    onTabChange(item.id);
    onCloseSidebar?.();
  };

  const toggleSaleOrder = (e) => {
    e.stopPropagation();
    setIsSaleOrderOpen(!isSaleOrderOpen);
  };

  const renderLogo = () => {
    if (companyInfo?.logo_base64) {
      return <img src={`data:image/png;base64,${companyInfo.logo_base64}`} alt={companyInfo.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    }
    if (companyInfo?.logo_url) {
       const token = localStorage.getItem('odoo_session_id') || '';
       const db = import.meta.env.VITE_ODOO_DB || 'stage';
       const url = `${companyInfo.logo_url}${companyInfo.logo_url.includes('?') ? '&' : '?'}token=${token}&db=${db}`;
       return <img src={url} alt={companyInfo.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    }
    return (
       <svg width="40" height="40" viewBox="0 0 200 200">
         <path d="M100 30 L160 150 L100 120 L40 150 Z" fill="#84cc16" />
         <path d="M100 120 L130 150 L100 140 L70 150 Z" fill="#1e40af" />
         <text x="100" y="145" textAnchor="middle" fill="white" fontSize="40" fontWeight="bold">E</text>
       </svg>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
           {renderLogo()}
        </div>
        {!isCollapsed && companyInfo?.name && (
          <span className="company-name">{companyInfo.name}</span>
        )}
        {isMobile && isOpen && (
          <button className="sidebar-close-btn" onClick={onCloseSidebar} aria-label="Close Sidebar">
            <X size={20} />
          </button>
        )}
      </div>
      
      <div className="user-profile">
        <div className="user-avatar">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} alt="User" />
        </div>
        {!isCollapsed && (
          <div className="user-info">
            <h3>{user?.name || 'User'}</h3>
            <p>{user?.company || 'Company'}</p>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => {
            if (item.isGroup) {
              const isActive = item.children.some(child => child.id === activeTab);
              return (
                <li key={item.id} className={`menu-group ${isCollapsed ? 'collapsed-group' : ''}`}>
                  <div 
                    className={`group-header ${isActive ? 'active' : ''}`}
                    onClick={isCollapsed ? () => handleTabClick(item.children[0]) : toggleSaleOrder}
                  >
                    <div className="group-title">
                      <item.icon size={20} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (isSaleOrderOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </div>
                  {!isCollapsed && isSaleOrderOpen && (
                    <ul className="submenu">
                      {item.children.map((child) => {
                        const hasNested = child.children && child.children.length > 0;
                        const isChildActive = child.children?.some(nc => nc.id === activeTab);
                        const isNestedOpen = openSubmenuId === child.id || isChildActive;
                        
                        return (
                          <li key={child.id} className="submenu-container">
                            <div 
                              className={`submenu-item ${child.disabled ? 'submenu-item-disabled' : ''} ${activeTab === child.id ? 'active' : ''}`}
                              onClick={() => {
                                if (hasNested) {
                                  setOpenSubmenuId(isNestedOpen && !isChildActive ? null : child.id);
                                  handleTabClick(child);
                                } else {
                                  handleTabClick(child);
                                }
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '1rem' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <child.icon size={16} />
                                <span>{child.label}</span>
                              </div>
                              {hasNested && (isNestedOpen ? <ChevronDown size={14} /> : <ChevronDown size={14} style={{ transform: 'rotate(-90deg)', opacity: 0.5 }} />)}
                            </div>
                            
                            {hasNested && isNestedOpen && (
                              <ul className="nested-submenu">
                                {child.children.map((nestedChild) => (
                                  <li 
                                    key={nestedChild.id}
                                    className={`submenu-item nested ${activeTab === nestedChild.id ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTabClick(nestedChild);
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <nestedChild.icon size={14} />
                                      <span>{nestedChild.label}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }
            return (
              <li 
                key={item.id} 
                className={activeTab === item.id ? 'active' : ''}
                onClick={() => handleTabClick(item)}
                title={isCollapsed ? item.label : ''}
              >
                <item.icon size={20} />
                {!isCollapsed && <span>{item.label}</span>}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={onLogout} title={isCollapsed ? 'Logout' : ''}>
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
