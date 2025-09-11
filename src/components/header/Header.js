import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import { apiUtils } from '../../api/services/apiUtils';

const Header = () => {
    // Check backend health on component mount
    useEffect(() => {
      const checkHealth = async () => {
        const isHealthy = await apiUtils.checkBackendHealth();
        if (isHealthy) {
          console.log('✅ Backend server is running');
        } else {
          console.warn('⚠️ Backend server is not responding');
        }
      };
      
      checkHealth();
    }, []);
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <span className="logo-icon">📓</span>
          <span className="logo-text">Jupyter Uses</span>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/database" className="nav-link">Database</Link>
          <a 
            href="https://jupyter.org" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-link external"
          >
            Official Site ↗
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
