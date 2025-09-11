import React, { useEffect } from 'react';
import { apiUtils } from '../../api/handlers/axios';
import ConnectionManager from './ConnectionManager';
import './DatabaseConnection.css';

const DatabaseConnection = () => {

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



  const handleConnectionSelect = (connection) => {
    console.log('Selected connection:', connection.name);
  };

  return (
    <div className="database-connection">
      {/* Connection Manager */}
      <ConnectionManager 
        onConnectionSelect={handleConnectionSelect}
      />
      
    </div>
  );
};

export default DatabaseConnection;
