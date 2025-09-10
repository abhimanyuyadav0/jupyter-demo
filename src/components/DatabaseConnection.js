import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setConnectionStatus, setConnectionType, setError, setConnectionConfig } from '../redux/slices/jupyterSlice';
import { databaseAPI, apiUtils } from '../services/api';
import './DatabaseConnection.css';

const DatabaseConnection = () => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [connectionConfig, setLocalConnectionConfig] = useState(
    liveDemo.connectionConfig || {
      host: 'localhost',
      port: '5432',
      database: 'jupyter_db',
      username: 'postgres',
      password: ''
    }
  );
  const [backendHealth, setBackendHealth] = useState(false);

  const databaseTypes = [
    { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', port: '5432' },
    { id: 'mysql', name: 'MySQL', icon: '🐬', port: '3306' },
    { id: 'mongodb', name: 'MongoDB', icon: '🍃', port: '27017' },
    { id: 'sqlite', name: 'SQLite', icon: '💎', port: 'N/A' }
  ];

  const handleConnectionTypeChange = (type) => {
    dispatch(setConnectionType(type));
    const dbType = databaseTypes.find(db => db.id === type);
    if (dbType && dbType.port !== 'N/A') {
      setLocalConnectionConfig(prev => ({ ...prev, port: dbType.port }));
    }
  };

  const handleConfigChange = (field, value) => {
    setLocalConnectionConfig(prev => ({ ...prev, [field]: value }));
  };

  // Check backend health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      const isHealthy = await apiUtils.checkBackendHealth();
      setBackendHealth(isHealthy);
      
      if (isHealthy) {
        // Check current connection status
        try {
          const status = await databaseAPI.getStatus();
          dispatch(setConnectionStatus(status.connected ? 'connected' : 'disconnected'));
        } catch (error) {
          console.warn('Could not get database status:', error);
        }
      }
    };
    
    checkHealth();
  }, [dispatch]);

  const handleConnect = async () => {
    if (!backendHealth) {
      dispatch(setError('Backend server is not running. Please start the FastAPI server on port 8000.'));
      return;
    }

    dispatch(setConnectionStatus('connecting'));
    dispatch(setError(null));

    try {
      // Use real API to connect to database
      const connectionData = {
        host: connectionConfig.host,
        port: parseInt(connectionConfig.port),
        database: connectionConfig.database,
        username: connectionConfig.username,
        password: connectionConfig.password,
        db_type: liveDemo.connectionType
      };

      const result = await databaseAPI.connect(connectionData);
      
      if (result.status === 'success') {
        dispatch(setConnectionStatus('connected'));
        dispatch(setConnectionConfig(connectionConfig));
        
        // Get initial analytics data
        try {
          const { analyticsAPI } = await import('../services/api');
          const metrics = await analyticsAPI.getMetrics();
          
          if (metrics.status === 'success') {
            const { setAnalyticsData } = await import('../redux/slices/jupyterSlice');
            dispatch(setAnalyticsData({
              totalRecords: metrics.metrics.total_users || 0,
              chartData: metrics.trends || [],
              insights: metrics.insights || []
            }));
          }
        } catch (analyticsError) {
          console.warn('Could not load initial analytics:', analyticsError);
        }
        
        console.log('✅ Successfully connected to database:', result.connection_info);
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      dispatch(setConnectionStatus('disconnected'));
      const errorMessage = apiUtils.formatError(error);
      dispatch(setError(errorMessage));
      console.error('❌ Database connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await databaseAPI.disconnect();
      dispatch(setConnectionStatus('disconnected'));
      console.log('✅ Successfully disconnected from database');
    } catch (error) {
      console.warn('⚠️ Error disconnecting:', error);
      dispatch(setConnectionStatus('disconnected')); // Force disconnect in UI
    }
  };

  const generateSampleChartData = () => {
    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    months.forEach(month => {
      data.push({
        month,
        sales: Math.floor(Math.random() * 1000) + 500,
        users: Math.floor(Math.random() * 200) + 100,
        revenue: Math.floor(Math.random() * 50000) + 25000
      });
    });
    
    return data;
  };

  return (
    <div className="database-connection">
      <div className="connection-form">
        <h3>Database Connection</h3>
        
        <div className="db-type-selector">
          <label>Database Type:</label>
          <div className="db-types">
            {databaseTypes.map(db => (
              <button
                key={db.id}
                className={`db-type-btn ${liveDemo.connectionType === db.id ? 'active' : ''}`}
                onClick={() => handleConnectionTypeChange(db.id)}
                disabled={liveDemo.connectionStatus === 'connecting'}
              >
                <span className="db-icon">{db.icon}</span>
                <span className="db-name">{db.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="connection-fields">
          <div className="field-row">
            <div className="field">
              <label>Host:</label>
              <input
                type="text"
                value={connectionConfig.host}
                onChange={(e) => handleConfigChange('host', e.target.value)}
                placeholder="localhost"
                disabled={liveDemo.connectionStatus === 'connecting'}
              />
            </div>
            <div className="field">
              <label>Port:</label>
              <input
                type="text"
                value={connectionConfig.port}
                onChange={(e) => handleConfigChange('port', e.target.value)}
                placeholder="5432"
                disabled={liveDemo.connectionStatus === 'connecting' || liveDemo.connectionType === 'sqlite'}
              />
            </div>
          </div>

          <div className="field">
            <label>Database:</label>
            <input
              type="text"
              value={connectionConfig.database}
              onChange={(e) => handleConfigChange('database', e.target.value)}
              placeholder="analytics_db"
              disabled={liveDemo.connectionStatus === 'connecting'}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Username:</label>
              <input
                type="text"
                value={connectionConfig.username}
                onChange={(e) => handleConfigChange('username', e.target.value)}
                placeholder="username"
                disabled={liveDemo.connectionStatus === 'connecting'}
              />
            </div>
            <div className="field">
              <label>Password:</label>
              <input
                type="password"
                value={connectionConfig.password}
                onChange={(e) => handleConfigChange('password', e.target.value)}
                placeholder="password"
                disabled={liveDemo.connectionStatus === 'connecting'}
              />
            </div>
          </div>
        </div>

        <div className="connection-actions">
          {liveDemo.connectionStatus !== 'connected' ? (
            <button
              className="connect-btn"
              onClick={handleConnect}
              disabled={liveDemo.connectionStatus === 'connecting'}
            >
              {liveDemo.connectionStatus === 'connecting' ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                <>
                  <span className="btn-icon">🔗</span>
                  Connect to Database
                </>
              )}
            </button>
          ) : (
            <button
              className="disconnect-btn"
              onClick={handleDisconnect}
            >
              <span className="btn-icon">🔌</span>
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="connection-info">
        <h4>Connection Details</h4>
        <div className="info-cards">
          <div className="info-card">
            <span className="info-label">Type:</span>
            <span className="info-value">
              {databaseTypes.find(db => db.id === liveDemo.connectionType)?.name}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">Status:</span>
            <span className={`info-value status-${liveDemo.connectionStatus}`}>
              {liveDemo.connectionStatus}
            </span>
          </div>
            <div className="info-card">
              <span className="info-label">Host:</span>
              <span className="info-value">{connectionConfig.host}:{connectionConfig.port}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Database:</span>
              <span className="info-value">{connectionConfig.database}</span>
            </div>
            {!backendHealth && (
              <div className="info-card">
                <span className="info-label">Backend:</span>
                <span className="info-value status-disconnected">Server not running</span>
              </div>
            )}
        </div>

        <div className="sample-queries">
          <h5>Sample Connection Code (Jupyter):</h5>
          <div className="code-preview">
            <pre>
{liveDemo.connectionType === 'postgresql' && `import psycopg2
import pandas as pd

# Connect to PostgreSQL
conn = psycopg2.connect(
    host="${connectionConfig.host}",
    port=${connectionConfig.port},
    database="${connectionConfig.database}",
    user="${connectionConfig.username}",
    password="your_password"
)

# Read data into DataFrame
df = pd.read_sql_query("SELECT * FROM your_table", conn)`}

{liveDemo.connectionType === 'mysql' && `import mysql.connector
import pandas as pd

# Connect to MySQL
conn = mysql.connector.connect(
    host="${connectionConfig.host}",
    port=${connectionConfig.port},
    database="${connectionConfig.database}",
    user="${connectionConfig.username}",
    password="your_password"
)

# Read data into DataFrame
df = pd.read_sql_query("SELECT * FROM your_table", conn)`}

{liveDemo.connectionType === 'mongodb' && `from pymongo import MongoClient
import pandas as pd

# Connect to MongoDB
client = MongoClient("mongodb://${connectionConfig.host}:${connectionConfig.port}/")
db = client["${connectionConfig.database}"]

# Read data into DataFrame
collection = db["your_collection"]
df = pd.DataFrame(list(collection.find()))`}

{liveDemo.connectionType === 'sqlite' && `import sqlite3
import pandas as pd

# Connect to SQLite
conn = sqlite3.connect("${connectionConfig.database}.db")

# Read data into DataFrame
df = pd.read_sql_query("SELECT * FROM your_table", conn)`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConnection;
