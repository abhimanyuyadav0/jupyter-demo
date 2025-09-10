import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setConnectionStatus, 
  setConnectionType, 
  setCurrentQuery, 
  setQueryResults, 
  setLoading, 
  setError, 
  setAnalyticsData 
} from '../redux/slices/jupyterSlice';
import DatabaseConnection from './DatabaseConnection';
import QueryEditor from './QueryEditor';
import DataVisualization from './DataVisualization';
import AnalyticsPanel from './AnalyticsPanel';
import './LiveDemo.css';

const LiveDemo = () => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [activeTab, setActiveTab] = useState('connection');

  // Simulate real-time data updates
  useEffect(() => {
    if (liveDemo.isConnected) {
      const interval = setInterval(() => {
        simulateRealTimeData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [liveDemo.isConnected]);

  const simulateRealTimeData = () => {
    const mockData = generateMockData();
    dispatch(setAnalyticsData({
      totalRecords: mockData.length,
      chartData: mockData,
      insights: generateInsights(mockData)
    }));
  };

  const generateMockData = () => {
    const data = [];
    const categories = ['Sales', 'Marketing', 'Support', 'Development'];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      data.push({
        id: i + 1,
        timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        category: categories[Math.floor(Math.random() * categories.length)],
        value: Math.floor(Math.random() * 1000) + 100,
        user_count: Math.floor(Math.random() * 50) + 10,
        revenue: (Math.random() * 10000).toFixed(2)
      });
    }
    return data;
  };

  const generateInsights = (data) => {
    const totalRevenue = data.reduce((sum, item) => sum + parseFloat(item.revenue), 0);
    const avgValue = data.reduce((sum, item) => sum + item.value, 0) / data.length;
    const topCategory = data.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    
    const mostPopularCategory = Object.keys(topCategory).reduce((a, b) => 
      topCategory[a] > topCategory[b] ? a : b
    );

    return [
      { title: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, trend: '+12%' },
      { title: 'Average Value', value: avgValue.toFixed(0), trend: '+5%' },
      { title: 'Top Category', value: mostPopularCategory, trend: 'Leading' },
      { title: 'Active Records', value: data.length.toString(), trend: 'Real-time' }
    ];
  };

  const tabs = [
    { id: 'connection', label: 'Database Connection', icon: '🔗' },
    { id: 'query', label: 'Query Editor', icon: '📝' },
    { id: 'visualization', label: 'Data Visualization', icon: '📊' },
    { id: 'analytics', label: 'Live Analytics', icon: '⚡' }
  ];

  return (
    <div className="live-demo">
      <div className="container">
        <div className="demo-header">
          <h1 className="demo-title">
            <span className="demo-icon">🚀</span>
            Live Jupyter Demo
          </h1>
          <p className="demo-description">
            Connect to your database and perform real-time analytics using Jupyter-like interface
          </p>
          
          <div className="connection-status">
            <div className={`status-indicator ${liveDemo.connectionStatus}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {liveDemo.connectionStatus === 'connected' ? 'Connected' : 
                 liveDemo.connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="demo-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.id !== 'connection' && !liveDemo.isConnected}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="demo-content">
          {activeTab === 'connection' && <DatabaseConnection />}
          {activeTab === 'query' && <QueryEditor />}
          {activeTab === 'visualization' && <DataVisualization />}
          {activeTab === 'analytics' && <AnalyticsPanel />}
        </div>

        {liveDemo.error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{liveDemo.error}</span>
            <button 
              className="error-dismiss"
              onClick={() => dispatch(setError(null))}
            >
              ✕
            </button>
          </div>
        )}

        <div className="demo-info">
          <h3>What You Can Do Here:</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon">🔗</span>
              <div className="info-content">
                <h4>Connect to Database</h4>
                <p>Simulate connections to PostgreSQL, MySQL, MongoDB, or SQLite</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📝</span>
              <div className="info-content">
                <h4>Write SQL Queries</h4>
                <p>Interactive query editor with syntax highlighting and auto-completion</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📊</span>
              <div className="info-content">
                <h4>Visualize Data</h4>
                <p>Create charts, graphs, and interactive visualizations from your data</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <div className="info-content">
                <h4>Real-time Analytics</h4>
                <p>Monitor live data streams and generate insights automatically</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDemo;
