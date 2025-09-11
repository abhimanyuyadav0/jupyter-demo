import React, { useState } from "react";
import "./AnalyticsPanel.css";

const AnalyticsPanelSimple = ({
  connections,
  loadingConnections,
  refetchConnections,
  serverError,
}) => {
  const [codeOutput, setCodeOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const sampleNotebookCode = `
# Real-time Analytics with pandas
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(0)
now = datetime.now()
minutes = pd.date_range(now - timedelta(minutes=30), now, freq='1min')

df = pd.DataFrame({
    'timestamp': minutes,
    'users': np.random.randint(20, 120, size=len(minutes)),
    'transactions': np.random.randint(5, 50, size=len(minutes)),
    'revenue': np.random.uniform(100, 2000, size=len(minutes)).round(2)
})

summary = df.agg({
    'users': ['mean', 'max'],
    'transactions': ['mean', 'max'],
    'revenue': ['sum', 'mean']
})

print('Last 30 min summary:')
print(summary)

# Show head
df.head(10)
`;

  const handleRunCode = () => {
    setIsRunning(true);
    // Simulate code execution
    setTimeout(() => {
      setCodeOutput({
        summary: {
          users: { mean: 68.5, max: 119 },
          transactions: { mean: 27.3, max: 49 },
          revenue: { sum: 27845.67, mean: 928.19 }
        },
        sampleData: [
          { timestamp: '2024-01-15 10:00:00', users: 45, transactions: 12, revenue: 1250.50 },
          { timestamp: '2024-01-15 10:01:00', users: 52, transactions: 18, revenue: 1890.25 },
          { timestamp: '2024-01-15 10:02:00', users: 38, transactions: 8, revenue: 945.75 },
          { timestamp: '2024-01-15 10:03:00', users: 61, transactions: 22, revenue: 2150.00 },
          { timestamp: '2024-01-15 10:04:00', users: 47, transactions: 15, revenue: 1675.30 }
        ]
      });
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="analytics-panel">
      <div className="panel-header">
        <h3>Analytics Dashboard</h3>
      </div>

      <div className="analytics-content">
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
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <strong>Python Analytics Code</strong>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Simulated pandas analytics execution
            </div>
          </div>
          
          <div style={{ padding: 12 }}>
            <pre
              style={{
                background: "#f8f9fa",
                padding: 16,
                borderRadius: 4,
                fontSize: 14,
                fontFamily: "Monaco, Consolas, 'Courier New', monospace",
                overflow: "auto",
                margin: 0,
                border: "1px solid #e1e5e9"
              }}
            >
              {sampleNotebookCode}
            </pre>
            
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                onClick={handleRunCode}
                disabled={isRunning}
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
                {isRunning ? "Running..." : "Run Code"}
              </button>
            </div>

            {codeOutput && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#374151" }}>Execution Results:</h4>
                
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ margin: "0 0 8px 0", color: "#4b5563" }}>Summary Statistics:</h5>
                  <div style={{ background: "#f9fafb", padding: 12, borderRadius: 4, fontSize: 14 }}>
                    <div><strong>Users:</strong> Mean: {codeOutput.summary.users.mean}, Max: {codeOutput.summary.users.max}</div>
                    <div><strong>Transactions:</strong> Mean: {codeOutput.summary.transactions.mean}, Max: {codeOutput.summary.transactions.max}</div>
                    <div><strong>Revenue:</strong> Sum: ${codeOutput.summary.revenue.sum.toFixed(2)}, Mean: ${codeOutput.summary.revenue.mean.toFixed(2)}</div>
                  </div>
                </div>

                <div>
                  <h5 style={{ margin: "0 0 8px 0", color: "#4b5563" }}>Sample Data:</h5>
                  <div style={{ overflow: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: "#f3f4f6" }}>
                          <th style={{ padding: "8px 12px", border: "1px solid #d1d5db", textAlign: "left" }}>Timestamp</th>
                          <th style={{ padding: "8px 12px", border: "1px solid #d1d5db", textAlign: "left" }}>Users</th>
                          <th style={{ padding: "8px 12px", border: "1px solid #d1d5db", textAlign: "left" }}>Transactions</th>
                          <th style={{ padding: "8px 12px", border: "1px solid #d1d5db", textAlign: "left" }}>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codeOutput.sampleData.map((row, index) => (
                          <tr key={index}>
                            <td style={{ padding: "8px 12px", border: "1px solid #d1d5db" }}>{row.timestamp}</td>
                            <td style={{ padding: "8px 12px", border: "1px solid #d1d5db" }}>{row.users}</td>
                            <td style={{ padding: "8px 12px", border: "1px solid #d1d5db" }}>{row.transactions}</td>
                            <td style={{ padding: "8px 12px", border: "1px solid #d1d5db" }}>${row.revenue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanelSimple;
