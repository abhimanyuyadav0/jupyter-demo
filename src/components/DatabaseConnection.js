import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setConnectionStatus, setConnectionType, setError } from '../redux/slices/jupyterSlice';
import './DatabaseConnection.css';

const DatabaseConnection = () => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [connectionConfig, setConnectionConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'analytics_db',
    username: 'jupyter_user',
    password: ''
  });

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
      setConnectionConfig(prev => ({ ...prev, port: dbType.port }));
    }
  };

  const handleConfigChange = (field, value) => {
    setConnectionConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    dispatch(setConnectionStatus('connecting'));
    dispatch(setError(null));

    // Simulate connection process
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate connection success
      if (Math.random() > 0.1) { // 90% success rate
        dispatch(setConnectionStatus('connected'));
        
        // Generate some initial sample data
        const sampleData = {
          totalRecords: 1247,
          chartData: generateSampleChartData(),
          insights: [
            { title: 'Connection Established', value: 'Success', trend: '+100%' },
            { title: 'Database Size', value: '2.3 GB', trend: 'Stable' },
            { title: 'Tables Found', value: '12', trend: 'Active' },
            { title: 'Last Updated', value: 'Just now', trend: 'Live' }
          ]
        };
        
        // Import and dispatch analytics data
        const { setAnalyticsData } = await import('../redux/slices/jupyterSlice');
        dispatch(setAnalyticsData(sampleData));
      } else {
        throw new Error('Connection timeout - please check your credentials');
      }
    } catch (error) {
      dispatch(setConnectionStatus('disconnected'));
      dispatch(setError(error.message));
    }
  };

  const handleDisconnect = () => {
    dispatch(setConnectionStatus('disconnected'));
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
