import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  removeConnection, 
  setActiveConnection, 
  updateConnectionStatus,
  loadSavedConnections,
  updateConnectionName,
  setConnectionStatus,
  setConnectionConfig,
  setConnectionType,
  setError,
  updateConnectionInList
} from '../../redux/slices/jupyterSlice';
import { connectionStorage } from '../../api/services/connections/connectionStorage';
import { databaseAPI, apiUtils, credentialsAPI } from '../../api/handlers/axios';
import ConnectionModal from './ConnectionModal';
import './ConnectionManager.css';
import { useNavigate } from 'react-router-dom';

const ConnectionManager = ({ onConnectionSelect, showNewConnection = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [editingConnection, setEditingConnection] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connectingTo, setConnectingTo] = useState(null);
  const [loadingServerConnections, setLoadingServerConnections] = useState(false);
  const [serverError, setServerError] = useState('');

  // Stop auto-saving locally; rely on backend as source of truth

  // Load saved connections from backend on mount and merge with local ones
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      setLoadingServerConnections(true);
      setServerError('');
      try {
        // Local first
        const local = connectionStorage.loadConnections();
        // Server
        const server = await credentialsAPI.getConnections();
        const mappedServer = Array.isArray(server) ? server.map(conn => ({
          id: conn.id,
          name: conn.name,
          config: {
            host: conn.config?.host,
            port: String(conn.config?.port ?? ''),
            database: conn.config?.database,
            username: conn.config?.username,
            password: ''
          },
          type: conn.type,
          status: conn.status || 'disconnected',
          lastConnected: conn.lastConnected || null,
          createdAt: conn.createdAt || null,
          hasSecureCredentials: !!conn.hasSecureCredentials
        })) : [];

        // Merge by id; prefer server entries
        const byId = new Map();
        [...local, ...mappedServer].forEach(c => {
          byId.set(String(c.id), c);
        });
        const merged = Array.from(byId.values());
        if (mounted) {
          dispatch(loadSavedConnections(merged));
        }
      } catch (e) {
        setServerError(apiUtils.formatError(e));
        // Fallback to just local
        const local = connectionStorage.loadConnections();
        if (mounted) {
          dispatch(loadSavedConnections(local));
        }
      } finally {
        if (mounted) setLoadingServerConnections(false);
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, [dispatch]);



  const handleSelectConnection = (connection) => {
    // Just select the connection, don't connect automatically
    setSelectedConnection(connection);
    dispatch(setActiveConnection(connection.id));
    
    // Update Redux state with connection details
    dispatch(setConnectionConfig(connection.config));
    dispatch(setConnectionType(connection.type));
    
    // Notify parent component
    if (onConnectionSelect) {
      onConnectionSelect(connection);
    }
  };

  const handleConnectToSelected = async (connection) => {
    console.log('🔍 handleConnectToSelected called with connection:', connection);
    console.log('🔍 hasSecureCredentials in connect:', connection.hasSecureCredentials);
    
    if (!connection) return;
    
    setConnectingTo(connection.id);
    
    try {
      dispatch(setError(null));

      let connectionData = {
        ...connection.config,
        db_type: connection.type
      };

      // Try to load secure credentials if available
      if (connection.hasSecureCredentials) {
        try {
          // Get connection with password from backend
          const connectionWithPassword = await credentialsAPI.getConnectionWithPassword(connection.id);
          connectionData = {
            ...connectionWithPassword.config,
            db_type: connectionWithPassword.type
          };
          
          console.log('🔓 Credentials loaded from backend');
        } catch (error) {
          console.warn('⚠️ Failed to load secure credentials from backend:', error);
          // Fall back to manual password entry
          const password = prompt(`Failed to load saved credentials. Enter password for ${connection.name}:`);
          if (!password) {
            setConnectingTo(null);
            return;
          }
          connectionData.password = password;
        }
      } else {
        // No saved credentials, prompt for password
        if (!connectionData.password) {
          const password = prompt(`Enter password for ${connection.name}:`);
          if (!password) {
            setConnectingTo(null);
            return;
          }
          connectionData.password = password;
        }
      }

      const result = await databaseAPI.connect(connectionData);
      
      if (result.status === 'success') {
        // Update connection status
        dispatch(updateConnectionStatus({
          connectionId: connection.id,
          status: 'connected',
          lastConnected: new Date().toISOString()
        }));
        
        dispatch(setConnectionStatus('connected'));
        
        console.log('✅ Connected to saved database:', connection.name);
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      dispatch(updateConnectionStatus({
        connectionId: connection.id,
        status: 'disconnected'
      }));
      
      const errorMessage = apiUtils.formatError(error);
      dispatch(setError(`Failed to connect to ${connection.name}: ${errorMessage}`));
      console.error('❌ Connection failed:', error);
    }
    
    setConnectingTo(null);
  };

  const handleDisconnectFromSelected = async (connection) => {
    if (!connection) return;
    
    try {
      await databaseAPI.disconnect();
      
      dispatch(updateConnectionStatus({
        connectionId: connection.id,
        status: 'disconnected'
      }));
      
      dispatch(setConnectionStatus('disconnected'));
      
      console.log('✅ Disconnected from database:', connection.name);
    } catch (error) {
      console.warn('⚠️ Error disconnecting:', error);
      // Force disconnect in UI even if API call failed
      dispatch(updateConnectionStatus({
        connectionId: connection.id,
        status: 'disconnected'
      }));
      dispatch(setConnectionStatus('disconnected'));
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

  const handleDoubleClick = async (connection) => {
    console.log('🔍 handleDoubleClick called with connection:', connection);
    console.log('🔍 hasSecureCredentials:', connection.hasSecureCredentials);
    console.log('🔍 typeof hasSecureCredentials:', typeof connection.hasSecureCredentials);
    
    try {
      // If connection has secure credentials, connect automatically
      if (connection.hasSecureCredentials) {
        console.log('🔍 Connection has secure credentials, proceeding with auto-connect');
        setConnectingTo(connection.id);
        dispatch(setError(null));

        // Get connection with password from backend
        const connectionWithPassword = await credentialsAPI.getConnectionWithPassword(connection.id);
        
        let connectionData = {
          ...connectionWithPassword.config,
          db_type: connectionWithPassword.type
        };

        // Test the connection
        const testResult = await databaseAPI.testConnection(connectionData);
        
        if (testResult.success) {
          // Update connection status to connected
          dispatch(updateConnectionStatus(connection.id, 'connected'));
          dispatch(setConnectionConfig(connection.id, connectionData));
          dispatch(setConnectionType(connection.id, connection.type));
          
          // Update the connection in Redux with the password so DatabaseExplorer can use it
          const updatedConnection = {
            ...connection,
            config: {
              ...connection.config,
              password: connectionData.password
            },
            status: 'connected'
          };
          
          // Update the connection in the connections array
          dispatch(updateConnectionInList(updatedConnection));
          
          console.log('✅ Auto-connected using saved credentials');
        } else {
          throw new Error(testResult.error || 'Connection test failed');
        }
      }

      // Always navigate regardless of whether we connected or not
      // Prime redux with the selected connection so explorer has context
      dispatch(setActiveConnection(connection.id));
      // Optionally reflect current status immediately
      dispatch(setConnectionStatus(connection.status || 'disconnected'));
      if (onConnectionSelect) {
        onConnectionSelect(connection);
      }
      
      console.log(`🚀 Navigating to /database/${connection.id}`);
      console.log('Current location before navigate:', window.location.pathname);
      navigate(`/database/${connection.id}`);
      console.log('Navigate called, checking location after...');
      setTimeout(() => {
        console.log('Location after navigate:', window.location.pathname);
      }, 100);
      
    } catch (error) {
      console.error('❌ Auto-connection failed:', error);
      dispatch(setError(`Auto-connection failed: ${error.message}`));
      
      // Still navigate even if connection failed
      dispatch(setActiveConnection(connection.id));
      dispatch(setConnectionStatus(connection.status || 'disconnected'));
      if (onConnectionSelect) {
        onConnectionSelect(connection);
      }
      
      console.log(`🚀 Navigating to /database/${connection.id} (despite connection error)`);
      navigate(`/database/${connection.id}`);
      
    } finally {
      setConnectingTo(null);
    }
  };
  // (Removed duplicate handleDoubleClick with incomplete code)
  return (
    <div className="connection-manager">
      <div className="manager-header">
        <h3>Database Connections</h3>
        <div className="manager-actions">
          {selectedConnection && (
            <>
              {selectedConnection.status === 'connected' ? (
                <button 
                  className="disconnect-current-btn" 
                  onClick={() => handleDisconnectFromSelected(selectedConnection)}
                  disabled={connectingTo === selectedConnection.id}
                >
                  <span className="btn-icon">🔌</span>
                  Disconnect
                </button>
              ) : (
                <button 
                  className="connect-current-btn" 
                  onClick={() => handleConnectToSelected(selectedConnection)}
                  disabled={connectingTo === selectedConnection.id}
                >
                  {connectingTo === selectedConnection.id ? (
                    <>
                      <span className="spinner"></span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🔗</span>
                      Connect
                    </>
                  )}
                </button>
              )}
            </>
          )}
          <button 
            className="new-connection-btn" 
            onClick={() => setShowConnectionModal(true)}
          >
            <span className="btn-icon">➕</span>
            New Connection
          </button>
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
        {serverError && (
          <div className="no-connections" style={{ background: '#fef2f2', border: '2px solid #fecaca' }}>
            <span className="no-conn-icon">⚠️</span>
            <p style={{ color: '#991b1b' }}>Failed to load server connections</p>
            <p className="no-conn-help" style={{ color: '#b91c1c' }}>{serverError}</p>
          </div>
        )}
        {loadingServerConnections && (
          <div className="no-connections">
            <span className="no-conn-icon">⏳</span>
            <p>Loading connections…</p>
            <p className="no-conn-help">Fetching from server and local storage</p>
          </div>
        )}
        {!loadingServerConnections && liveDemo.connections.length === 0 ? (
          <div className="no-connections">
            <span className="no-conn-icon">🔌</span>
            <p>No saved connections</p>
            <p className="no-conn-help">Connect to a database and check "Save credentials"</p>
          </div>
        ) : (!loadingServerConnections && (
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%' }}>{
            liveDemo.connections.map(connection => (
            <div 
              key={connection.id} 
              className={`connection-card ${selectedConnection?.id === connection.id ? 'selected' : ''} ${connection.status}`}
            >
              <div className="card-header">
                <div className="card-status">
                  <span className="status-indicator">
                    {getConnectionStatusIcon(connection.status)}
                  </span>
                  <span className="connection-type-badge">{connection.type}</span>
                </div>
                
                <div className="card-actions">
                  <button
                    className="test-nav-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🧪 Test navigation button clicked');
                      navigate(`/database/${connection.id}`);
                    }}
                    title="Test navigation"
                    style={{background: 'orange', color: 'white', marginRight: '5px', fontSize: '12px'}}
                  >
                    👁️
                  </button>
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

              <div className="card-content" 
                onClick={() => {
                  console.log('🖱️ Single click detected, selecting connection');
                  handleSelectConnection(connection);
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🖱️ Double-click detected on connection:', connection.name, connection.id);
                  console.log('Connection object:', connection);
                  console.log('Connection hasSecureCredentials:', connection.hasSecureCredentials);
                  // Navigate to explorer page on double click
                  handleDoubleClick(connection);
                }}>
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
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <h4 className="connection-name" title={connection.name}>
                    {connection.name}
                  </h4>
                )}
                
                <div className="connection-details">
                  <span className="connection-host">
                    {connection.config.host}:{connection.config.port}
                  </span>
                  <span className="connection-database">
                    📊 {connection.config.database}
                  </span>
                  <div className="connection-meta">
                    <span className="connection-time">
                      🕒 {getTimeAgo(connection.lastConnected)}
                    </span>
                    {connection.hasSecureCredentials && (
                      <span className="secure-indicator" title="Credentials saved securely">
                        🔒 Secure
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedConnection?.id === connection.id && (
                <div className="selected-indicator">
                  <span>✓</span>
                </div>
              )}
            </div>
            ))
          }</div>
        ))}
      </div>

      {showNewConnection && (
        <div className="new-connection-hint">
          <p>💡 Use "New Connection" to add databases. Check "Save credentials securely" to store them automatically.</p>
        </div>
      )}


      {/* Connection Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onSuccess={(newConnection) => {
          console.log('✅ New connection created:', newConnection.name || 'Temporary connection');
          // Modal will handle Redux updates
        }}
      />
    </div>
  );
};

export default ConnectionManager;
