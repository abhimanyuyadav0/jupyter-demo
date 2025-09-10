import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setConnectionStatus, setConnectionType, setConnectionConfig, addConnection, setActiveConnection } from '../redux/slices/jupyterSlice';
import { databaseAPI, apiUtils } from '../services/api';
import { connectionStorage } from '../services/connectionStorage';
import './ConnectionModal.css';

const ConnectionModal = ({ isOpen, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [connectionConfig, setLocalConnectionConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'jupyter_db',
    username: 'postgres',
    password: ''
  });
  const [selectedType, setSelectedType] = useState('postgresql');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionName, setConnectionName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const databaseTypes = [
    { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', port: '5432', color: '#336791' },
    { id: 'mysql', name: 'MySQL', icon: '🐬', port: '3306', color: '#4479A1' },
    { id: 'mongodb', name: 'MongoDB', icon: '🍃', port: '27017', color: '#47A248' },
    { id: 'sqlite', name: 'SQLite', icon: '💎', port: 'N/A', color: '#003B57' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setConnectionConfig({
        host: 'localhost',
        port: '5432',
        database: 'jupyter_db',
        username: 'postgres',
        password: ''
      });
      setSelectedType('postgresql');
      setIsConnecting(false);
      setConnectionError(null);
      setIsConnected(false);
      setConnectionName('');
      setShowSaveForm(false);
    }
  }, [isOpen]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    const dbType = databaseTypes.find(db => db.id === type);
    if (dbType && dbType.port !== 'N/A') {
      setLocalConnectionConfig(prev => ({ ...prev, port: dbType.port }));
    }
  };

  const handleConfigChange = (field, value) => {
    setLocalConnectionConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const connectionData = {
        host: connectionConfig.host,
        port: parseInt(connectionConfig.port),
        database: connectionConfig.database,
        username: connectionConfig.username,
        password: connectionConfig.password,
        db_type: selectedType
      };

      const result = await databaseAPI.connect(connectionData);
      
      if (result.status === 'success') {
        setIsConnected(true);
        
        // Generate default connection name
        const defaultName = connectionStorage.generateConnectionName(connectionConfig, selectedType);
        setConnectionName(defaultName);
        
        console.log('✅ Successfully connected to database:', result.connection_info);
        
        // Show save form
        setShowSaveForm(true);
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      const errorMessage = apiUtils.formatError(error);
      setConnectionError(errorMessage);
      console.error('❌ Database connection failed:', error);
    }
    
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    try {
      await databaseAPI.disconnect();
      setIsConnected(false);
      setShowSaveForm(false);
      console.log('✅ Successfully disconnected from database');
    } catch (error) {
      console.warn('⚠️ Error disconnecting:', error);
      setIsConnected(false); // Force disconnect in UI
    }
  };

  const handleSaveConnection = () => {
    if (!connectionName.trim()) {
      setConnectionError('Connection name is required');
      return;
    }

    const connectionId = Date.now().toString();
    const newConnection = {
      id: connectionId,
      name: connectionName.trim(),
      config: connectionConfig,
      type: selectedType,
      status: 'connected',
      lastConnected: new Date().toISOString()
    };

    // Add to Redux store
    dispatch(addConnection(newConnection));
    dispatch(setActiveConnection(connectionId));
    dispatch(setConnectionStatus('connected'));
    dispatch(setConnectionConfig(connectionConfig));
    dispatch(setConnectionType(selectedType));
    
    // Save to localStorage
    connectionStorage.saveConnection(newConnection);
    
    console.log('✅ Connection saved successfully:', newConnection.name);
    
    // Call success callback and close modal
    if (onSuccess) {
      onSuccess(newConnection);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="connection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Database Connection</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          {/* Database Type Selection */}
          <div className="section">
            <h3>Select Database Type</h3>
            <div className="db-type-grid">
              {databaseTypes.map(db => (
                <button
                  key={db.id}
                  className={`db-type-card ${selectedType === db.id ? 'selected' : ''}`}
                  onClick={() => handleTypeChange(db.id)}
                  disabled={isConnecting}
                  style={{ '--db-color': db.color }}
                >
                  <span className="db-icon">{db.icon}</span>
                  <span className="db-name">{db.name}</span>
                  <span className="db-port">Port: {db.port}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Configuration */}
          <div className="section">
            <h3>Connection Details</h3>
            <div className="connection-form-grid">
              <div className="form-row">
                <div className="form-field">
                  <label>Host</label>
                  <input
                    type="text"
                    value={connectionConfig.host}
                    onChange={(e) => handleConfigChange('host', e.target.value)}
                    placeholder="localhost"
                    disabled={isConnecting || isConnected}
                  />
                </div>
                <div className="form-field">
                  <label>Port</label>
                  <input
                    type="text"
                    value={connectionConfig.port}
                    onChange={(e) => handleConfigChange('port', e.target.value)}
                    placeholder="5432"
                    disabled={isConnecting || isConnected || selectedType === 'sqlite'}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Database Name</label>
                <input
                  type="text"
                  value={connectionConfig.database}
                  onChange={(e) => handleConfigChange('database', e.target.value)}
                  placeholder="analytics_db"
                  disabled={isConnecting || isConnected}
                />
              </div>

              {selectedType !== 'sqlite' && (
                <div className="form-row">
                  <div className="form-field">
                    <label>Username</label>
                    <input
                      type="text"
                      value={connectionConfig.username}
                      onChange={(e) => handleConfigChange('username', e.target.value)}
                      placeholder="username"
                      disabled={isConnecting || isConnected}
                    />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={connectionConfig.password}
                      onChange={(e) => handleConfigChange('password', e.target.value)}
                      placeholder="password"
                      disabled={isConnecting || isConnected}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connection Status */}
          {connectionError && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {connectionError}
            </div>
          )}

          {isConnected && !showSaveForm && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              Successfully connected to database!
            </div>
          )}

          {/* Save Connection Form */}
          {showSaveForm && (
            <div className="section save-section">
              <h3>Save Connection</h3>
              <div className="form-field">
                <label>Connection Name</label>
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="Enter a name for this connection"
                />
              </div>
              <div className="connection-preview">
                <strong>Preview:</strong> {connectionConfig.database}@{connectionConfig.host}:{connectionConfig.port} ({selectedType})
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          {!isConnected ? (
            <>
              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="connect-btn"
                onClick={handleConnect}
                disabled={isConnecting || !connectionConfig.host || !connectionConfig.database}
              >
                {isConnecting ? (
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
            </>
          ) : (
            <>
              <button className="disconnect-btn" onClick={handleDisconnect}>
                <span className="btn-icon">🔌</span>
                Disconnect
              </button>
              {showSaveForm && (
                <button
                  className="save-btn"
                  onClick={handleSaveConnection}
                  disabled={!connectionName.trim()}
                >
                  <span className="btn-icon">💾</span>
                  Save Connection
                </button>
              )}
              <button className="use-btn" onClick={() => {
                // Use connection without saving
                dispatch(setConnectionStatus('connected'));
                dispatch(setConnectionConfig(connectionConfig));
                dispatch(setConnectionType(selectedType));
                if (onSuccess) {
                  onSuccess({ temp: true, config: connectionConfig, type: selectedType });
                }
                onClose();
              }}>
                <span className="btn-icon">✓</span>
                Use Without Saving
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
