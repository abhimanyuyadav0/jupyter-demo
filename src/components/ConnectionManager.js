import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  addConnection, 
  removeConnection, 
  setActiveConnection, 
  updateConnectionStatus,
  loadSavedConnections,
  updateConnectionName,
  setConnectionStatus,
  setError
} from '../redux/slices/jupyterSlice';
import { connectionStorage } from '../services/connectionStorage';
import { databaseAPI, apiUtils } from '../services/api';
import './ConnectionManager.css';

const ConnectionManager = ({ onConnectionSelect, showNewConnection = false }) => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [editingConnection, setEditingConnection] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);

  // Load saved connections on component mount
  useEffect(() => {
    const savedConnections = connectionStorage.loadConnections();
    dispatch(loadSavedConnections(savedConnections));
  }, [dispatch]);

  // Auto-save connections when they change
  useEffect(() => {
    if (liveDemo.connections.length > 0) {
      connectionStorage.saveConnections(liveDemo.connections);
    }
  }, [liveDemo.connections]);

  const handleSaveCurrentConnection = () => {
    if (!liveDemo.isConnected || !liveDemo.connectionConfig) {
      dispatch(setError('No active connection to save'));
      return;
    }

    const defaultName = connectionStorage.generateConnectionName(
      liveDemo.connectionConfig, 
      liveDemo.connectionType
    );
    setNewConnectionName(defaultName);
    setShowSaveDialog(true);
  };

  const confirmSaveConnection = () => {
    if (!newConnectionName.trim()) {
      dispatch(setError('Connection name is required'));
      return;
    }

    const connectionId = Date.now().toString();
    const newConnection = {
      id: connectionId,
      name: newConnectionName.trim(),
      config: liveDemo.connectionConfig,
      type: liveDemo.connectionType,
      status: 'connected',
      lastConnected: new Date().toISOString()
    };

    dispatch(addConnection(newConnection));
    dispatch(setActiveConnection(connectionId));
    setShowSaveDialog(false);
    setNewConnectionName('');
    
    console.log('✅ Connection saved successfully:', newConnection.name);
  };

  const handleSelectConnection = async (connection) => {
    if (connection.status === 'connected' && liveDemo.activeConnectionId === connection.id) {
      // Already connected to this database
      return;
    }

    try {
      dispatch(setConnectionStatus('connecting'));
      dispatch(setError(null));

      // Use the saved connection config but require password input
      const connectionData = {
        ...connection.config,
        db_type: connection.type
      };

      // If no password saved, prompt for it
      if (!connectionData.password) {
        const password = prompt(`Enter password for ${connection.name}:`);
        if (!password) {
          dispatch(setConnectionStatus('disconnected'));
          return;
        }
        connectionData.password = password;
      }

      const result = await databaseAPI.connect(connectionData);
      
      if (result.status === 'success') {
        // Update connection status
        dispatch(updateConnectionStatus({
          connectionId: connection.id,
          status: 'connected',
          lastConnected: new Date().toISOString()
        }));
        
        // Set as active connection
        dispatch(setActiveConnection(connection.id));
        dispatch(setConnectionStatus('connected'));
        
        // Notify parent component
        if (onConnectionSelect) {
          onConnectionSelect(connection);
        }
        
        console.log('✅ Connected to saved database:', connection.name);
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      dispatch(setConnectionStatus('disconnected'));
      dispatch(updateConnectionStatus({
        connectionId: connection.id,
        status: 'disconnected'
      }));
      
      const errorMessage = apiUtils.formatError(error);
      dispatch(setError(`Failed to connect to ${connection.name}: ${errorMessage}`));
      console.error('❌ Connection failed:', error);
    }
  };

  const handleDeleteConnection = (connectionId) => {
    const connection = liveDemo.connections.find(conn => conn.id === connectionId);
    if (connection && window.confirm(`Delete connection "${connection.name}"?`)) {
      dispatch(removeConnection(connectionId));
      connectionStorage.removeConnection(connectionId);
      console.log('🗑️ Connection deleted');
    }
  };

  const handleRenameConnection = (connectionId, newName) => {
    if (newName.trim()) {
      dispatch(updateConnectionName({ connectionId, name: newName.trim() }));
      setEditingConnection(null);
    }
  };

  const handleExportConnections = () => {
    connectionStorage.exportConnections();
  };

  const handleImportConnections = (event) => {
    const file = event.target.files[0];
    if (file) {
      connectionStorage.importConnections(file)
        .then(connections => {
          dispatch(loadSavedConnections(connections));
          console.log('✅ Connections imported successfully');
        })
        .catch(error => {
          dispatch(setError(`Import failed: ${error.message}`));
        });
    }
  };

  const getConnectionStatusIcon = (status) => {
    switch (status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '🔴';
      default: return '⚪';
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="connection-manager">
      <div className="manager-header">
        <h3>Database Connectionss</h3>
        <div className="manager-actions">
          {liveDemo.isConnected && (
            <button className="save-current-btn" onClick={handleSaveCurrentConnection}>
              <span className="btn-icon">💾</span>
              Save Current
            </button>
          )}
          <button 
            className="import-export-btn" 
            onClick={() => setShowImportExport(!showImportExport)}
          >
            <span className="btn-icon">📁</span>
            Import/Export
          </button>
        </div>
      </div>

      {showImportExport && (
        <div className="import-export-section">
          <button className="export-btn" onClick={handleExportConnections}>
            <span className="btn-icon">📤</span>
            Export Connections
          </button>
          <label className="import-btn">
            <span className="btn-icon">📥</span>
            Import Connections
            <input
              type="file"
              accept=".json"
              onChange={handleImportConnections}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      <div className="connections-list">
        {liveDemo.connections.length === 0 ? (
          <div className="no-connections">
            <span className="no-conn-icon">🔌</span>
            <p>No saved connections</p>
            <p className="no-conn-help">Connect to a database and save it to see it here</p>
          </div>
        ) : (
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%' }}>{
            liveDemo.connections.map(connection => (
              <div 
                key={connection.id} 
                className={`connection-item ${liveDemo.activeConnectionId === connection.id ? 'active' : ''}`}
              >
                <div className="connection-info" onClick={() => handleSelectConnection(connection)}>
                  <div className="connection-header">
                    <span className="connection-status">
                      {getConnectionStatusIcon(connection.status)}
                    </span>
                    {editingConnection === connection.id ? (
                      <input
                        type="text"
                        defaultValue={connection.name}
                        className="connection-name-input"
                        onBlur={(e) => handleRenameConnection(connection.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameConnection(connection.id, e.target.value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="connection-name" title={connection.name}>
                        {connection.name}
                      </span>
                    )}
                    <span className="connection-type">{connection.type}</span>
                  </div>
                  
                  <div className="connection-details">
                    <span className="connection-host">
                      {connection.config.host}:{connection.config.port}/{connection.config.database}
                    </span>
                    <span className="connection-time">
                      {getTimeAgo(connection.lastConnected)}
                    </span>
                  </div>
                </div>
                
                <div className="connection-actions">
                  <button
                    className="edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingConnection(connection.id);
                    }}
                    title="Rename connection"
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConnection(connection.id);
                    }}
                    title="Delete connection"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          }</div>
        )}
      </div>

      {showNewConnection && (
        <div className="new-connection-hint">
          <p>💡 After connecting to a new database, click "Save Current" to add it to your saved connections.</p>
        </div>
      )}

      {/* Save Connection Dialog */}
      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="save-dialog">
            <h4>Save Database Connection</h4>
            <p>Save this connection for quick access later</p>
            
            <div className="save-form">
              <label>Connection Name:</label>
              <input
                type="text"
                value={newConnectionName}
                onChange={(e) => setNewConnectionName(e.target.value)}
                placeholder="Enter a name for this connection"
                className="connection-name-input"
              />
              
              <div className="connection-preview">
                <strong>Database:</strong> {liveDemo.connectionConfig.database}<br/>
                <strong>Host:</strong> {liveDemo.connectionConfig.host}:{liveDemo.connectionConfig.port}<br/>
                <strong>Type:</strong> {liveDemo.connectionType}
              </div>
            </div>
            
            <div className="dialog-actions">
              <button className="cancel-btn" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={confirmSaveConnection}>
                <span className="btn-icon">💾</span>
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;
