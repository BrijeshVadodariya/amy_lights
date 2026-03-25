import React from 'react';
import { Loader2 } from 'lucide-react';
import './Loader.css';

const Loader = ({ message = "Loading data..." }) => {
  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="spinner-wrapper">
          <Loader2 className="spinner-icon animate-spin" size={32} />
          <div className="spinner-ring"></div>
        </div>
        {message && <p className="loader-text font-bold uppercase tracking-widest">{message}</p>}
      </div>
    </div>
  );
};

export default Loader;
