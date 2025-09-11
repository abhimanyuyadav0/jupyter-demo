import React, { useState, useEffect } from "react";
import { Jupyter, Cell } from "@datalayer/jupyter-react";
import "./AnalyticsPanel.css";

const AnalyticsPanel = ({
  connections,
  loadingConnections,
  refetchConnections,
  serverError,
}) => {
  const [jupyterError, setJupyterError] = useState(false);

  useEffect(() => {
    // Check if Jupyter components are available
    try {
      if (typeof Jupyter === 'undefined' || typeof Cell === 'undefined') {
        setJupyterError(true);
      }
    } catch (error) {
      console.warn('Jupyter components not available:', error);
      setJupyterError(true);
    }
  }, []);
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

  // Fallback component if Jupyter fails
  if (jupyterError) {
    return (
      <div className="analytics-panel">
        <div className="panel-header">
          <h3>Analytics Dashboard</h3>
        </div>
        <div className="analytics-content">
          <div style={{
            padding: 24,
            textAlign: "center",
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            color: "#92400e"
          }}>
            <h4 style={{ margin: "0 0 8px 0" }}>Jupyter Components Not Available</h4>
            <p style={{ margin: 0, fontSize: 14 }}>
              The Jupyter React components are currently not loading properly. 
              Please check the console for more details or use the simplified analytics view.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <Jupyter>
            <div
              style={{
                padding: 12,
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong>Jupyter Code Cell</strong>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                Run Python snippets inline via @datalayer/jupyter-react
              </div>
            </div>
            <div style={{ padding: 12 }}>
              <Cell source={sampleNotebookCode} autoRun={false} />
            </div>
          </Jupyter>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;

