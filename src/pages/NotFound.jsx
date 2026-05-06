import React from 'react';
import { Home, ArrowLeft, Ghost } from 'lucide-react';

const NotFound = ({ onNavigate }) => {
  return (
    <div className="not-found-container" style={{
      height: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '20px',
      background: 'transparent',
      fontFamily: '"Inter", sans-serif'
    }}>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes shadow {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.2; }
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .ghost-icon {
          animation: float 3s ease-in-out infinite;
          filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
        }
        .ghost-shadow {
          width: 60px;
          height: 10px;
          background: #000;
          border-radius: 50%;
          margin-top: 20px;
          animation: shadow 3s ease-in-out infinite;
        }
        .error-code {
          font-size: 120px;
          font-weight: 900;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1;
          letter-spacing: -5px;
        }
        .error-message {
          font-size: 1.5rem;
          color: #475569;
          font-weight: 700;
          margin-top: 10px;
        }
        .error-sub {
          color: #94a3b8;
          max-width: 400px;
          margin: 15px 0 30px;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        .btn-row {
          display: flex;
          gap: 12px;
        }
        .nf-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
        }
        .nf-btn.primary {
          background: #0f172a;
          color: white;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }
        .nf-btn.primary:hover {
          background: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
        }
        .nf-btn.secondary {
          background: white;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .nf-btn.secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-2px);
        }
      `}</style>

      <div className="ghost-icon">
        <Ghost size={100} strokeWidth={1.5} className="text-slate-200" />
      </div>
      <div className="ghost-shadow"></div>

      <h1 className="error-code">404</h1>
      <p className="error-message">Oops! Page Disappeared</p>
      <p className="error-sub">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <div className="btn-row">
        <button className="nf-btn secondary" onClick={() => window.history.back()}>
          <ArrowLeft size={18} />
          <span>Go Back</span>
        </button>
        <button className="nf-btn primary" onClick={() => onNavigate('dashboard')}>
          <Home size={18} />
          <span>Return Home</span>
        </button>
      </div>
    </div>
  );
};

export default NotFound;
