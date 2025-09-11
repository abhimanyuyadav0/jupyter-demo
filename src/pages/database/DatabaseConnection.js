import React from 'react';
import ConnectionManager from './ConnectionManager';
import './DatabaseConnection.css';

const DatabaseConnection = ({ connections, loadingConnections, refetchConnections, serverError }) => {
  const handleConnectionSelect = (connection) => {
    console.log('Selected connection:', connection.name);
  };

  return (
    <div className="database-connection">
      {/* Connection Manager */}
      <ConnectionManager 
        onConnectionSelect={handleConnectionSelect}
        connections={connections}
        loadingConnections={loadingConnections}
        refetchConnections={refetchConnections}
        serverError={serverError}
      />
    </div>
  );
};

export default DatabaseConnection;
