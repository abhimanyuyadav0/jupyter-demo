import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveConnection } from '../redux/slices/jupyterSlice';
import './DatabaseSelector.css';

const DatabaseSelector = ({ showLabel = true, compact = false }) => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);

  const handleConnectionChange = (connectionId) => {
    if (connectionId === '') {
      // Handle "new connection" option
      window.location.hash = '#/live-demo';
      return;
    }
    
    dispatch(setActiveConnection(connectionId));
  };

  const getConnectionDisplayName = (connection) => {
    if (compact) {
      return `${connection.config.database}@${connection.config.host}`;
    }
    return connection.name;
  };

  const getConnectionStatus = (connection) => {
    switch (connection.status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '🔴';
      default: return '⚪';
    }
  };

  if (liveDemo.connections.length === 0) {
    return (
      <div className={`database-selector ${compact ? 'compact' : ''}`}>
        {showLabel && <label className="selector-label">Database:</label>}
        <div className="no-connections-indicator">
          <span className="no-conn-icon">🔌</span>
          <span className="no-conn-text">No connections</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`database-selector ${compact ? 'compact' : ''}`}>
      {showLabel && <label className="selector-label">Database:</label>}
      
      <div className="selector-container">
        <select
          value={liveDemo.activeConnectionId || ''}
          onChange={(e) => handleConnectionChange(e.target.value)}
          className="connection-select"
        >
          <option value="">Select database...</option>
          {liveDemo.connections.map(connection => (
            <option key={connection.id} value={connection.id}>
              {getConnectionDisplayName(connection)} ({connection.type})
            </option>
          ))}
          <option value="" disabled>───────────────</option>
          <option value="">+ New Connection</option>
        </select>
        
        {liveDemo.currentConnection && (
          <div className="connection-indicator">
            <span className="status-icon" title={liveDemo.currentConnection.status}>
              {getConnectionStatus(liveDemo.currentConnection)}
            </span>
            {!compact && (
              <span className="connection-info">
                {liveDemo.currentConnection.config.database}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseSelector;
