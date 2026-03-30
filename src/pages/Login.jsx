import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import './Login.css';

const Login = ({ onLogin, loading, companyInfo }) => {
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('admin');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  const renderLogo = () => {
    if (companyInfo?.logo_base64) {
      return <img src={`data:image/png;base64,${companyInfo.logo_base64}`} alt={companyInfo.name} style={{ width: '120px', height: '120px', objectFit: 'contain' }} />;
    }
    if (companyInfo?.logo_url) {
      return <img src={companyInfo.logo_url} alt={companyInfo.name} style={{ width: '120px', height: '120px', objectFit: 'contain' }} />;
    }
    return (
       <svg width="120" height="120" viewBox="0 0 200 200">
         <circle cx="100" cy="100" r="90" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
         <path d="M100 30 L160 150 L100 120 L40 150 Z" fill="#84cc16" />
         <path d="M100 120 L130 150 L100 140 L70 150 Z" fill="#1e40af" />
         <text x="100" y="145" textAnchor="middle" fill="white" fontSize="40" fontWeight="bold">E</text>
       </svg>
    );
  };

  return (
    <div className="login-container">
      <div className="login-logo">
         {renderLogo()}
      </div>

      <div className="login-card">
        <h1>Log in</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="admin" 
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Mail size={20} className="input-icon" />
          </div>

          <div className="input-group">
            <input 
              type="password" 
              placeholder="admin" 
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Lock size={20} className="input-icon" />
          </div>

          <a href="#" className="forgot-link">Forgot password?</a>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
