import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setAnalyticsData, setRealTimeData } from '../../redux/slices/jupyterSlice';
import { analyticsAPI, websocketManager, apiUtils } from '../../services/api';
import './AnalyticsPanel.css';

const AnalyticsPanel = () => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [realTimeData, setLocalRealTimeData] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket setup
  useEffect(() => {
    // Set up WebSocket event listeners
    const handleConnected = () => {
      setWsConnected(true);
      console.log('✅ WebSocket connected to analytics');
    };

    const handleDisconnected = () => {
      setWsConnected(false);
      setIsStreaming(false);
      console.log('🔌 WebSocket disconnected from analytics');
    };

    const handleRealTimeData = (data) => {
      if (data.type === 'real_time_data') {
        const newDataPoint = {
          timestamp: new Date(data.timestamp),
          ...data.data
        };
        setLocalRealTimeData(prev => [...prev.slice(-19), newDataPoint]);
        dispatch(setRealTimeData([...liveDemo.realTimeData.slice(-19), newDataPoint]));
      }
    };

    const handleError = (error) => {
      console.error('❌ WebSocket error in analytics:', error);
      setIsStreaming(false);
    };

    // Add event listeners
    websocketManager.on('connected', handleConnected);
    websocketManager.on('disconnected', handleDisconnected);
    websocketManager.on('real_time_data', handleRealTimeData);
    websocketManager.on('error', handleError);

    // Connect if not already connected
    if (websocketManager.getConnectionState() === 'DISCONNECTED') {
      websocketManager.connect();
    }

    // Cleanup
    return () => {
      websocketManager.off('connected', handleConnected);
      websocketManager.off('disconnected', handleDisconnected);
      websocketManager.off('real_time_data', handleRealTimeData);
      websocketManager.off('error', handleError);
    };
  }, [dispatch, liveDemo.realTimeData]);

  // Load initial analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const metrics = await analyticsAPI.getMetrics();
        if (metrics.status === 'success') {
          dispatch(setAnalyticsData({
            totalRecords: metrics.metrics.total_users || 0,
            chartData: metrics.trends || [],
            insights: metrics.insights || []
          }));
        }
      } catch (error) {
        console.warn('Could not load analytics data:', error);
      }
    };

    if (liveDemo.isConnected) {
      loadAnalytics();
    }
  }, [liveDemo.isConnected, dispatch]);

  const toggleStreaming = () => {
    if (!wsConnected) {
      console.warn('⚠️ WebSocket not connected, cannot start streaming');
      return;
    }

    if (isStreaming) {
      websocketManager.stopStream();
      setIsStreaming(false);
      console.log('⏸️ Stopped real-time data streaming');
    } else {
      websocketManager.startStream();
      setIsStreaming(true);
      setLocalRealTimeData([]); // Clear previous data
      console.log('▶️ Started real-time data streaming');
    }
  };

  const exportToJupyter = async () => {
    try {
      const exportData = {
        title: "Real-time Analytics Dashboard",
        description: "Generated from Jupyter Frontend Live Demo",
        queries: [
          "SELECT COUNT(*) as total_users FROM users;",
          "SELECT DATE_TRUNC('day', order_date) as day, COUNT(*) as orders, SUM(total_amount) as revenue FROM orders GROUP BY day ORDER BY day DESC LIMIT 7;",
          "SELECT p.name, p.category, COUNT(o.id) as order_count FROM products p LEFT JOIN orders o ON p.id = o.user_id GROUP BY p.id, p.name, p.category;"
        ]
      };

      const result = await analyticsAPI.exportNotebook(exportData);
      
      if (result.status === 'success') {
        const filename = result.filename || 'analytics_notebook.ipynb';
        apiUtils.downloadFile(result.notebook, filename, 'application/json');
        console.log('📁 Successfully exported Jupyter notebook');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('❌ Failed to export notebook:', error);
      // Fallback to local generation
      const notebookCode = generateJupyterNotebook();
      apiUtils.downloadFile(notebookCode, 'analytics_notebook.ipynb', 'application/json');
    }
  };

  const generateJupyterNotebook = () => {
    const notebook = {
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            "# Real-time Analytics Dashboard\n",
            "\n",
            "This notebook contains the analytics code generated from the live demo.\n"
          ]
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            "import pandas as pd\n",
            "import numpy as np\n",
            "import matplotlib.pyplot as plt\n",
            "import seaborn as sns\n",
            "from datetime import datetime, timedelta\n",
            "\n",
            "# Database connection setup\n",
            `# Connection: ${liveDemo.connectionType}\n`,
            "# Replace with your actual connection details\n"
          ]
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            "# Real-time data analysis\n",
            "def analyze_real_time_data():\n",
            "    # Fetch latest data\n",
            "    query = \"\"\"\n",
            "    SELECT \n",
            "        timestamp,\n",
            "        COUNT(*) as transactions,\n",
            "        SUM(revenue) as total_revenue,\n",
            "        COUNT(DISTINCT user_id) as unique_users\n",
            "    FROM events \n",
            "    WHERE timestamp >= NOW() - INTERVAL '1 hour'\n",
            "    GROUP BY timestamp\n",
            "    ORDER BY timestamp DESC\n",
            "    \"\"\"\n",
            "    \n",
            "    df = pd.read_sql_query(query, conn)\n",
            "    return df\n"
          ]
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            "# Visualization functions\n",
            "def create_real_time_dashboard():\n",
            "    fig, axes = plt.subplots(2, 2, figsize=(15, 10))\n",
            "    \n",
            "    # Revenue trend\n",
            "    axes[0, 0].plot(df['timestamp'], df['total_revenue'])\n",
            "    axes[0, 0].set_title('Revenue Trend')\n",
            "    \n",
            "    # User activity\n",
            "    axes[0, 1].bar(range(len(df)), df['unique_users'])\n",
            "    axes[0, 1].set_title('Active Users')\n",
            "    \n",
            "    # Transaction volume\n",
            "    axes[1, 0].plot(df['timestamp'], df['transactions'], marker='o')\n",
            "    axes[1, 0].set_title('Transaction Volume')\n",
            "    \n",
            "    # Performance metrics\n",
            "    metrics = ['Revenue', 'Users', 'Transactions']\n",
            "    values = [df['total_revenue'].sum(), df['unique_users'].sum(), df['transactions'].sum()]\n",
            "    axes[1, 1].pie(values, labels=metrics, autopct='%1.1f%%')\n",
            "    axes[1, 1].set_title('Performance Distribution')\n",
            "    \n",
            "    plt.tight_layout()\n",
            "    plt.show()\n"
          ]
        }
      ],
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: {
          name: 'python',
          version: '3.8.0'
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };
    
    return JSON.stringify(notebook, null, 2);
  };

  return (
    <div className="analytics-panel">
      <div className="panel-header">
        <h3>Live Analytics Dashboard</h3>
        <div className="panel-controls">
          <button
            className={`streaming-btn ${isStreaming ? 'active' : ''}`}
            onClick={toggleStreaming}
            disabled={!liveDemo.isConnected || !wsConnected}
          >
            <span className="btn-icon">{isStreaming ? '⏸️' : '▶️'}</span>
            {isStreaming ? 'Stop Stream' : 'Start Stream'}
          </button>
          <button
            className="export-btn"
            onClick={exportToJupyter}
            disabled={!liveDemo.isConnected}
          >
            <span className="btn-icon">📁</span>
            Export to Jupyter
          </button>
        </div>
      </div>

      <div className="analytics-content">
        {/* Key Metrics */}
        <div className="metrics-grid">
          {liveDemo.analyticsData.insights.map((insight, index) => (
            <div key={index} className="metric-card">
              <div className="metric-header">
                <span className="metric-title">{insight.title}</span>
                <span className={`metric-trend ${insight.trend.startsWith('+') ? 'positive' : 'neutral'}`}>
                  {insight.trend}
                </span>
              </div>
              <div className="metric-value">{insight.value}</div>
            </div>
          ))}
        </div>

        {/* Real-time Stream */}
        <div className="real-time-section">
          <div className="section-header">
            <h4>Real-time Data Stream</h4>
            <div className="stream-status">
              <span className={`status-dot ${isStreaming && wsConnected ? 'active' : ''}`}></span>
              <span>
                {!wsConnected ? 'Disconnected' : isStreaming ? 'Streaming' : 'Stopped'}
              </span>
            </div>
          </div>
          
          <div className="stream-data">
            {realTimeData.length === 0 ? (
              <div className="no-stream-data">
                <span className="stream-icon">📡</span>
                <p>
                  {!wsConnected 
                    ? "WebSocket disconnected - reconnecting..." 
                    : "Click \"Start Stream\" to begin receiving real-time data"
                  }
                </p>
              </div>
            ) : (
              <div className="data-stream">
                {realTimeData.slice(-10).reverse().map((dataPoint, index) => (
                  <div key={index} className="data-point">
                    <div className="data-timestamp">
                      {dataPoint.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="data-values">
                      <span className="data-item">
                        <strong>Users:</strong> {dataPoint.users}
                      </span>
                      <span className="data-item">
                        <strong>Transactions:</strong> {dataPoint.transactions}
                      </span>
                      <span className="data-item">
                        <strong>Revenue:</strong> ${dataPoint.revenue}
                      </span>
                      <span className="data-item">
                        <strong>Value:</strong> {dataPoint.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Insights */}
        <div className="insights-section">
          <h4>AI-Powered Insights</h4>
          <div className="insights-list">
            <div className="insight-item">
              <span className="insight-icon">📈</span>
              <div className="insight-content">
                <h5>Revenue Growth Detected</h5>
                <p>Revenue has increased by 12% in the last hour compared to the previous period.</p>
              </div>
            </div>
            <div className="insight-item">
              <span className="insight-icon">👥</span>
              <div className="insight-content">
                <h5>User Activity Spike</h5>
                <p>Unusual user activity detected. Consider scaling resources to handle increased load.</p>
              </div>
            </div>
            <div className="insight-item">
              <span className="insight-icon">⚠️</span>
              <div className="insight-content">
                <h5>Performance Alert</h5>
                <p>Transaction processing time has increased by 8%. Monitor system performance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Jupyter Integration */}
        <div className="jupyter-integration">
          <h4>Jupyter Integration</h4>
          <div className="integration-info">
            <div className="integration-item">
              <span className="integration-icon">📊</span>
              <div className="integration-content">
                <h5>Live Data Analysis</h5>
                <p>All streaming data can be analyzed in real-time using pandas and numpy</p>
              </div>
            </div>
            <div className="integration-item">
              <span className="integration-icon">🤖</span>
              <div className="integration-content">
                <h5>Machine Learning</h5>
                <p>Apply ML models to predict trends and detect anomalies in live data</p>
              </div>
            </div>
            <div className="integration-item">
              <span className="integration-icon">📈</span>
              <div className="integration-content">
                <h5>Interactive Visualizations</h5>
                <p>Create dynamic charts and dashboards using matplotlib, plotly, and bokeh</p>
              </div>
            </div>
          </div>

          <div className="jupyter-code-example">
            <h5>Live Analysis Code:</h5>
            <div className="code-preview">
              <pre>
{`# Real-time analytics in Jupyter
import pandas as pd
import numpy as np
from datetime import datetime

# Stream processing function
def process_stream_data(new_data):
    # Convert to DataFrame
    df = pd.DataFrame(new_data)
    
    # Calculate moving averages
    df['revenue_ma'] = df['revenue'].rolling(window=5).mean()
    df['users_ma'] = df['users'].rolling(window=5).mean()
    
    # Detect anomalies
    df['revenue_anomaly'] = np.abs(df['revenue'] - df['revenue_ma']) > 2 * df['revenue'].std()
    
    # Generate alerts
    if df['revenue_anomaly'].iloc[-1]:
        print(f"⚠️ Revenue anomaly detected at {datetime.now()}")
    
    return df

# Visualization update
def update_dashboard(df):
    plt.figure(figsize=(12, 8))
    
    plt.subplot(2, 2, 1)
    plt.plot(df.index, df['revenue'], label='Revenue')
    plt.plot(df.index, df['revenue_ma'], label='Moving Average')
    plt.title('Real-time Revenue')
    plt.legend()
    
    plt.subplot(2, 2, 2)
    plt.scatter(df['users'], df['revenue'], alpha=0.7)
    plt.title('Users vs Revenue')
    
    plt.tight_layout()
    plt.show()`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
