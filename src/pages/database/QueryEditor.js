import React, { useState, useEffect } from 'react';
import { queryService as queryAPI } from '../../api/services/query';
import { apiUtils } from '../../api/services/apiUtils';
import './QueryEditor.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const QueryEditor = ({ connection }) => {
  const [queryHistory, setQueryHistory] = useState([]);
  const [sampleQueries, setSampleQueries] = useState([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState(null);
  const queryClient = useQueryClient();

  // Load sample queries from backend with TanStack Query
  const { data: samplesData } = useQuery({
    queryKey: ['query-samples'],
    queryFn: () => queryAPI.getSamples(),
    staleTime: 5 * 60 * 1000,
    onError: () => setSampleQueries(defaultSampleQueries)
  });

  useEffect(() => {
    if (samplesData?.status === 'success') {
      setSampleQueries(samplesData.samples);
    } else if (samplesData) {
      setSampleQueries(defaultSampleQueries);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samplesData]);

  // Load history when connected
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['query-history', Boolean(connection)],
    enabled: Boolean(connection),
    queryFn: () => queryAPI.getHistory(10),
  });

  useEffect(() => {
    if (historyData?.status === 'success') {
      setQueryHistory(historyData.history);
    }
  }, [historyData]);

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
    setCurrentQuery(e.target.value);
  };

  const loadSampleQuery = (query) => {
    setCurrentQuery(query);
  };

  const executeMutation = useMutation({
    mutationFn: (queryData) => queryAPI.execute(queryData),
    onMutate: () => {
      setIsLoading(true);
      setError(null);
    },
    onSuccess: async (result) => {
      if (result.success) {
        setQueryResults(result.data || []);
        await queryClient.invalidateQueries({ queryKey: ['query-history'] });
        refetchHistory();
      } else {
        setError(result.error || 'Query execution failed');
      }
    },
    onError: (error) => {
      const errorMessage = apiUtils.formatError(error);
      setError(errorMessage);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const executeQuery = async () => {
    if (!currentQuery.trim()) {
      setError('Please enter a query to execute');
      return;
    }
    const queryData = {
      query: currentQuery,
      limit: 1000
    };
    await executeMutation.mutateAsync(queryData);
  };

  const clearQuery = () => {
    setCurrentQuery('');
    setQueryResults([]);
  };

  return (
    <div className="query-editor">
      <div className="editor-header">
        <h3>SQL Query Editor ({connection?.name})</h3>
        <div className="editor-actions">
          <button 
            className="execute-btn"
            onClick={executeQuery}
            disabled={isLoading || !currentQuery.trim()}
          >
            {isLoading ? (
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
            disabled={isLoading}
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
                  disabled={isLoading}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          <div className="query-input">
            <textarea
              value={currentQuery}
              onChange={handleQueryChange}
              placeholder="Enter your SQL query here..."
              className="query-textarea"
              disabled={isLoading}
            />
          </div>
        </div>

        {queryResults.length > 0 && (
          <div className="query-results">
            <div className="results-header">
              <h4>Query Results</h4>
              <span className="result-count">
                {queryResults.length} rows returned
              </span>
            </div>
            
            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    {Object.keys(queryResults[0] || {}).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.map((row, index) => (
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
${currentQuery}
"""

# Execute query
df = pd.read_sql_query(query, conn)

# Display results
print(f"Query returned ${queryResults.length} rows")
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
                      {item?.timestamp}
                    </span>
                    <span className="history-rows">
                      {item?.rowCount || 0} rows
                    </span>
                  </div>
                  <div className="history-query">
                    {item?.query?.slice(0, 100)}
                    {item?.query?.length > 100 && '...'}
                  </div>
                  <button
                    className="history-load-btn"
                    onClick={() => loadSampleQuery(item?.query)}
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
