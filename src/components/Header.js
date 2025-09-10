import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <span className="logo-icon">📓</span>
          <span className="logo-text">Jupyter Uses</span>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/live-demo" className="nav-link">Live Demo</Link>
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
