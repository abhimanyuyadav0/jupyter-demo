import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveConnection } from '../redux/slices/jupyterSlice';
import './DatabaseSelector.css';
import ConnectionManager from './ConnectionManager';

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
      {showLabel && <label className="selector-label">Database: ...</label>}
    </div>
  );
};

export default DatabaseSelector;
