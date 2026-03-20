import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Box, 
  ShoppingCart, 
  ShoppingBag, 
  LogOut,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ user, activeTab, onTabChange, onLogout, isOpen, onCloseSidebar }) => {
  const [isSaleOrderOpen, setIsSaleOrderOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Box },
    { 
      id: 'sale-order-group', 
      label: 'Sale Order', 
      icon: ShoppingCart,
      isGroup: true,
      children: [
        { id: 'selection', label: 'Selection', icon: Box, disabled: true },
        { id: 'quotations', label: 'Quotation', icon: Clock },
        { id: 'orders', label: 'Orders', icon: FileText }
      ]
    },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: ShoppingBag },
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

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
           <svg width="40" height="40" viewBox="0 0 200 200">
             <path d="M100 30 L160 150 L100 120 L40 150 Z" fill="#84cc16" />
             <path d="M100 120 L130 150 L100 140 L70 150 Z" fill="#1e40af" />
             <text x="100" y="145" textAnchor="middle" fill="white" fontSize="40" fontWeight="bold">E</text>
           </svg>
        </div>
      </div>
      
      <div className="user-profile">
        <div className="user-avatar">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} alt="User" />
        </div>
        <div className="user-info">
          <h3>{user?.name || 'User'}</h3>
          <p>{user?.company || 'Company'}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => {
            if (item.isGroup) {
              const isActive = item.children.some(child => child.id === activeTab);
              return (
                <li key={item.id} className="menu-group">
                  <div 
                    className={`group-header ${isActive ? 'active' : ''}`}
                    onClick={toggleSaleOrder}
                  >
                    <div className="group-title">
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </div>
                    {isSaleOrderOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  {isSaleOrderOpen && (
                    <ul className="submenu">
                      {item.children.map((child) => (
                        <li 
                          key={child.id}
                          className={`submenu-item ${child.disabled ? 'submenu-item-disabled' : ''} ${activeTab === child.id ? 'active' : ''}`}
                          onClick={() => handleTabClick(child)}
                        >
                          <child.icon size={16} />
                          <span>{child.label}</span>
                        </li>
                      ))}
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
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={onLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
