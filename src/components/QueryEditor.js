import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentQuery, setQueryResults, setLoading, setError } from '../redux/slices/jupyterSlice';
import { queryAPI, apiUtils } from '../services/api';
import './QueryEditor.css';

const QueryEditor = () => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [queryHistory, setQueryHistory] = useState([]);
  const [sampleQueries, setSampleQueries] = useState([]);

  // Load sample queries from backend
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const samples = await queryAPI.getSamples();
        if (samples.status === 'success') {
          setSampleQueries(samples.samples);
        }
      } catch (error) {
        console.warn('Could not load sample queries:', error);
        // Fallback to default samples
        setSampleQueries(defaultSampleQueries);
      }
    };

    const loadHistory = async () => {
      try {
        const history = await queryAPI.getHistory(10);
        if (history.status === 'success') {
          setQueryHistory(history.history);
        }
      } catch (error) {
        console.warn('Could not load query history:', error);
      }
    };

    loadSamples();
    if (liveDemo.isConnected) {
      loadHistory();
    }
  }, [liveDemo.isConnected]);

  const defaultSampleQueries = [
    {
      name: "User Analytics",
      query: `SELECT 
  user_id,
  COUNT(*) as total_sessions,
  AVG(session_duration) as avg_duration,
  SUM(revenue) as total_revenue
FROM user_sessions 
WHERE created_at >= '2023-01-01'
GROUP BY user_id
ORDER BY total_revenue DESC
LIMIT 10;`
    },
    {
      name: "Sales Trends",
      query: `SELECT 
  DATE_TRUNC('month', order_date) as month,
  COUNT(*) as total_orders,
  SUM(amount) as total_revenue,
  AVG(amount) as avg_order_value
FROM orders
WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY month
ORDER BY month;`
    },
    {
      name: "Product Performance",
      query: `SELECT 
  p.product_name,
  p.category,
  SUM(oi.quantity) as units_sold,
  SUM(oi.total_price) as revenue,
  COUNT(DISTINCT o.customer_id) as unique_customers
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY p.id, p.product_name, p.category
ORDER BY revenue DESC;`
    }
  ];

  const handleQueryChange = (e) => {
    dispatch(setCurrentQuery(e.target.value));
  };

  const loadSampleQuery = (query) => {
    dispatch(setCurrentQuery(query));
  };

  const executeQuery = async () => {
    if (!liveDemo.currentQuery.trim()) {
      dispatch(setError('Please enter a query to execute'));
      return;
    }

    if (!liveDemo.isConnected) {
      dispatch(setError('Please connect to database first'));
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const queryData = {
        query: liveDemo.currentQuery,
        limit: 1000
      };

      const result = await queryAPI.execute(queryData);
      
      if (result.success) {
        dispatch(setQueryResults(result.data || []));
        
        // Refresh query history
        try {
          const history = await queryAPI.getHistory(10);
          if (history.status === 'success') {
            setQueryHistory(history.history);
          }
        } catch (historyError) {
          console.warn('Could not refresh history:', historyError);
        }
        
        console.log(`✅ Query executed successfully: ${result.row_count} rows returned`);
      } else {
        throw new Error(result.error || 'Query execution failed');
      }
      
    } catch (error) {
      const errorMessage = apiUtils.formatError(error);
      dispatch(setError(errorMessage));
      console.error('❌ Query execution failed:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const generateMockQueryResults = (query) => {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Generate different mock data based on query content
    if (queryLower.includes('user')) {
      for (let i = 0; i < 15; i++) {
        results.push({
          user_id: `user_${1000 + i}`,
          total_sessions: Math.floor(Math.random() * 50) + 5,
          avg_duration: (Math.random() * 3600).toFixed(2),
          total_revenue: (Math.random() * 1000).toFixed(2)
        });
      }
    } else if (queryLower.includes('sales') || queryLower.includes('order')) {
      const months = ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06'];
      months.forEach(month => {
        results.push({
          month,
          total_orders: Math.floor(Math.random() * 500) + 100,
          total_revenue: (Math.random() * 50000 + 10000).toFixed(2),
          avg_order_value: (Math.random() * 200 + 50).toFixed(2)
        });
      });
    } else if (queryLower.includes('product')) {
      const products = ['Laptop Pro', 'Wireless Mouse', 'Keyboard', 'Monitor', 'Headphones'];
      const categories = ['Electronics', 'Accessories', 'Computing'];
      
      products.forEach(product => {
        results.push({
          product_name: product,
          category: categories[Math.floor(Math.random() * categories.length)],
          units_sold: Math.floor(Math.random() * 200) + 50,
          revenue: (Math.random() * 10000 + 1000).toFixed(2),
          unique_customers: Math.floor(Math.random() * 100) + 20
        });
      });
    } else {
      // Generic results
      for (let i = 0; i < 10; i++) {
        results.push({
          id: i + 1,
          name: `Record ${i + 1}`,
          value: Math.floor(Math.random() * 1000),
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }
    
    return results;
  };

  const clearQuery = () => {
    dispatch(setCurrentQuery(''));
    dispatch(setQueryResults([]));
  };

  return (
    <div className="query-editor">
      <div className="editor-header">
        <h3>SQL Query Editor</h3>
        <div className="editor-actions">
          <button 
            className="execute-btn"
            onClick={executeQuery}
            disabled={liveDemo.isLoading || !liveDemo.currentQuery.trim()}
          >
            {liveDemo.isLoading ? (
              <>
                <span className="spinner small"></span>
                Executing...
              </>
            ) : (
              <>
                <span className="btn-icon">▶️</span>
                Execute Query
              </>
            )}
          </button>
          <button 
            className="clear-btn"
            onClick={clearQuery}
            disabled={liveDemo.isLoading}
          >
            <span className="btn-icon">🗑️</span>
            Clear
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="query-input-section">
          <div className="sample-queries">
            <h4>Sample Queries:</h4>
            <div className="sample-buttons">
              {sampleQueries.map((sample, index) => (
                <button
                  key={index}
                  className="sample-btn"
                  onClick={() => loadSampleQuery(sample.query)}
                  disabled={liveDemo.isLoading}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          <div className="query-input">
            <textarea
              value={liveDemo.currentQuery}
              onChange={handleQueryChange}
              placeholder="Enter your SQL query here..."
              className="query-textarea"
              disabled={liveDemo.isLoading}
            />
          </div>
        </div>

        {liveDemo.queryResults.length > 0 && (
          <div className="query-results">
            <div className="results-header">
              <h4>Query Results</h4>
              <span className="result-count">
                {liveDemo.queryResults.length} rows returned
              </span>
            </div>
            
            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    {Object.keys(liveDemo.queryResults[0] || {}).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveDemo.queryResults.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="jupyter-code">
              <h5>Equivalent Jupyter Code:</h5>
              <div className="code-preview">
                <pre>
{`# Execute query and load into DataFrame
import pandas as pd

query = """
${liveDemo.currentQuery}
"""

# Execute query
df = pd.read_sql_query(query, conn)

# Display results
print(f"Query returned {liveDemo.queryResults.length} rows")
df.head(10)`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {queryHistory.length > 0 && (
          <div className="query-history">
            <h4>Query History</h4>
            <div className="history-list">
              {queryHistory.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-meta">
                    <span className="history-time">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="history-rows">
                      {item.rowCount} rows
                    </span>
                  </div>
                  <div className="history-query">
                    {item.query.slice(0, 100)}
                    {item.query.length > 100 && '...'}
                  </div>
                  <button
                    className="history-load-btn"
                    onClick={() => loadSampleQuery(item.query)}
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryEditor;
