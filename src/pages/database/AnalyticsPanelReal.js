import React, { useState, useEffect } from "react";
import "./AnalyticsPanel.css";
import { useQuery } from "@tanstack/react-query";

const AnalyticsPanelReal = ({
  connections,
  loadingConnections,
  refetchConnections,
  serverError,
}) => {
  const [codeOutput, setCodeOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSample, setSelectedSample] = useState("");

  // Sample queries that work with real database
  const sampleQueries = {
    "users": {
      name: "User Analytics",
      description: "Analyze user activity and engagement",
      query: `
SELECT 
    u.user_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
    AVG(EXTRACT(EPOCH FROM (u.last_login - u.created_at))/3600) as avg_hours_to_login,
    COUNT(DISTINCT ae.user_id) as users_with_events
FROM users u
LEFT JOIN analytics_events ae ON u.id = ae.user_id
GROUP BY u.user_type
ORDER BY total_users DESC;`
    },
    "events": {
      name: "Event Analytics",
      description: "Most common user events and patterns",
      query: `
SELECT 
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp))/3600) as avg_hours_ago
FROM analytics_events
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY event_type
ORDER BY event_count DESC;`
    },
    "sales": {
      name: "Sales Performance",
      description: "Product sales and revenue analysis",
      query: `
SELECT 
    category,
    COUNT(*) as total_sales,
    SUM(quantity) as total_units,
    SUM(price * quantity) as total_revenue,
    AVG(price) as avg_price,
    COUNT(DISTINCT customer_id) as unique_customers
FROM sales_data
WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category
ORDER BY total_revenue DESC;`
    },
    "top_products": {
      name: "Top Products",
      description: "Best selling products by revenue",
      query: `
SELECT 
    product_name,
    category,
    COUNT(*) as sales_count,
    SUM(quantity) as total_units,
    SUM(price * quantity) as total_revenue,
    AVG(price) as avg_price
FROM sales_data
GROUP BY product_name, category
ORDER BY total_revenue DESC
LIMIT 10;`
    },
    "schema": {
      name: "Database Schema",
      description: "Get all tables and columns in the database",
      query: `
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name, ordinal_position
LIMIT 50;`
    }
  };

  const [currentQuery, setCurrentQuery] = useState(sampleQueries.schema.query);

  // Execute query using the backend API
  const { data: queryResult, refetch: executeQuery } = useQuery({
    queryKey: ["executeQuery", currentQuery],
    queryFn: async () => {
      if (!currentQuery.trim()) return null;
      
      const response = await fetch('http://localhost:8000/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentQuery.trim(),
          limit: 100
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Query execution failed');
      }

      return response.json();
    },
    enabled: false, // Don't auto-execute
    retry: false
  });

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      await executeQuery();
    } catch (error) {
      setCodeOutput({
        success: false,
        error: error.message,
        data: null
      });
    }
    setIsRunning(false);
  };

  const handleSampleSelect = (sampleKey) => {
    setSelectedSample(sampleKey);
    setCurrentQuery(sampleQueries[sampleKey].query);
  };

  // Update output when query result changes
  useEffect(() => {
    if (queryResult) {
      setCodeOutput(queryResult);
    }
  }, [queryResult]);

  const renderDataTable = (data, columns) => {
    if (!data || !columns || data.length === 0) {
      return <div style={{ padding: 16, color: "#6b7280", textAlign: "center" }}>No data to display</div>;
    }

    return (
      <div style={{ overflow: "auto", maxHeight: "400px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f3f4f6", position: "sticky", top: 0 }}>
              {columns.map((col, index) => (
                <th key={index} style={{ padding: "8px 12px", border: "1px solid #d1d5db", textAlign: "left" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex} style={{ padding: "8px 12px", border: "1px solid #d1d5db" }}>
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div style={{ padding: 8, background: "#f9fafb", textAlign: "center", fontSize: 12, color: "#6b7280" }}>
            Showing first 50 rows of {data.length} total rows
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="analytics-panel">
      <div className="panel-header">
        <h3>Real Database Analytics</h3>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          Execute SQL queries against your connected PostgreSQL database
        </p>
      </div>

      <div className="analytics-content">
        {/* Sample Query Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>Sample Queries:</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(sampleQueries).map(([key, sample]) => (
              <button
                key={key}
                onClick={() => handleSampleSelect(key)}
                style={{
                  background: selectedSample === key ? "#3b82f6" : "#f3f4f6",
                  color: selectedSample === key ? "white" : "#374151",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        {/* Query Editor */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 16
          }}
        >
          <div
            style={{
              padding: 12,
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <strong>SQL Query Editor</strong>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {selectedSample ? sampleQueries[selectedSample].description : "Write or select a query to execute"}
            </div>
          </div>
          
          <div style={{ padding: 12 }}>
            <textarea
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              style={{
                width: "100%",
                minHeight: "120px",
                padding: 12,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 14,
                fontFamily: "Monaco, Consolas, 'Courier New', monospace",
                resize: "vertical",
                background: "#fafafa"
              }}
            />
            
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {queryResult && (
                  <>
                    {queryResult.success ? (
                      <>✅ Query executed successfully ({queryResult.row_count} rows, {queryResult.execution_time?.toFixed(3)}s)</>
                    ) : (
                      <>❌ Query failed: {queryResult.error}</>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={handleRunCode}
                disabled={isRunning || !currentQuery.trim()}
                style={{
                  background: isRunning ? "#6b7280" : "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 4,
                  cursor: isRunning ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                {isRunning ? "Executing..." : "Execute Query"}
              </button>
            </div>
          </div>
        </div>

        {/* Results Display */}
        {codeOutput && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 12,
                background: codeOutput.success ? "#f0f9ff" : "#fef2f2",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong style={{ color: codeOutput.success ? "#0369a1" : "#dc2626" }}>
                {codeOutput.success ? "Query Results" : "Query Error"}
              </strong>
            </div>
            
            <div style={{ padding: 12 }}>
              {codeOutput.success ? (
                <div>
                  {codeOutput.data && codeOutput.columns ? (
                    <>
                      <div style={{ marginBottom: 12, fontSize: 14, color: "#374151" }}>
                        <strong>Results:</strong> {codeOutput.row_count} rows returned
                        {codeOutput.execution_time && (
                          <span style={{ marginLeft: 16, color: "#6b7280" }}>
                            Execution time: {codeOutput.execution_time.toFixed(3)}s
                          </span>
                        )}
                      </div>
                      {renderDataTable(codeOutput.data, codeOutput.columns)}
                    </>
                  ) : (
                    <div style={{ padding: 16, color: "#6b7280", textAlign: "center" }}>
                      Query executed successfully but returned no data
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  padding: 16, 
                  background: "#fef2f2", 
                  borderRadius: 4, 
                  border: "1px solid #fecaca",
                  color: "#dc2626"
                }}>
                  <strong>Error:</strong> {codeOutput.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>Database Status:</strong> {serverError ? "❌ Connection Error" : "✅ Connected to PostgreSQL"}</span>
            <span style={{ color: "#6b7280" }}>Backend: localhost:8000</span>
          </div>
          {serverError && (
            <div style={{ marginTop: 8, color: "#dc2626", fontSize: 12 }}>
              {serverError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanelReal;
