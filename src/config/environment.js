/**
 * Frontend environment configuration
 */

export const config = {
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  
  // Feature flags
  ENABLE_REAL_DB: process.env.REACT_APP_ENABLE_REAL_DB === 'true',
  
  // Development settings
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // App settings
  APP_NAME: 'Jupyter Frontend',
  APP_VERSION: '1.0.0'
};

export default config;
