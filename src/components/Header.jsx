import React, { useState } from 'react';
import { Menu, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import './Header.css';

const Header = ({ user, companyInfo, title, onLogout, onMenuToggle, isSidebarOpen }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const pageTitleMap = {
    dashboard: 'Dashboard',
    products: 'Products',
    quotations: 'Quotations',
    orders: 'Orders',
    selection: 'Selection',
    purchase_orders: 'Purchase Orders',
    'order-detail': 'Order Detail',
    'product-detail': 'Product Detail',
    'create-order': 'Create Quotation',
    'crm': 'CRM',
  };
  const pageTitle = pageTitleMap[title] || 'Dashboard';

  return (
    <header className="main-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}>
          <Menu size={22} />
        </button>
        <div className="header-page-title">{pageTitle}</div>
      </div>
      
      <div className="header-right">
        <div className="user-dropdown-container">
          <div className="user-profile-trigger" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="user-thumb">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} alt="User" />
            </div>
            <div className="user-meta">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">{companyInfo?.name || user?.company || 'Company'}</span>
            </div>
            <ChevronDown size={14} className={showDropdown ? 'rotate-180' : ''} />
          </div>

          {showDropdown && (
            <div className="header-popup card shadow-xl">
              <div className="popup-header">
                <strong>{user?.name}</strong>
                <p>{user?.email}</p>
              </div>
              <div className="popup-divider"></div>
              <button className="popup-item" onClick={() => { setShowDropdown(false); /* Navigate to profile */ }}>
                <UserIcon size={16} />
                <span>My Profile</span>
              </button>
              <button className="popup-item logout" onClick={() => { setShowDropdown(false); onLogout(); }}>
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
