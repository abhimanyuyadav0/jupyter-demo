import React, { useState } from "react";
import { useSelector } from "react-redux";
import "./DataVisualization.css";

const DataVisualization = ({
  connections,
  loadingConnections,
  refetchConnections,
  serverError,
}) => {
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [chartType, setChartType] = useState("bar");
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  const chartTypes = [
    { id: "bar", name: "Bar Chart", icon: "📊" },
    { id: "line", name: "Line Chart", icon: "📈" },
    { id: "pie", name: "Pie Chart", icon: "🥧" },
    { id: "scatter", name: "Scatter Plot", icon: "⚪" },
  ];

  const metrics = [
    { id: "revenue", name: "Revenue", color: "#667eea" },
    { id: "users", name: "Users", color: "#764ba2" },
    { id: "sales", name: "Sales", color: "#10b981" },
    { id: "growth", name: "Growth %", color: "#f59e0b" },
  ];

  const generateVisualizationData = () => {
    if (
      !liveDemo.analyticsData.chartData ||
      liveDemo.analyticsData.chartData.length === 0
    ) {
      return [];
    }

    return liveDemo.analyticsData.chartData.map((item) => ({
      ...item,
      [selectedMetric]: Math.floor(Math.random() * 1000) + 100,
    }));
  };

  const renderChart = () => {
    const data = generateVisualizationData();

    if (data.length === 0) {
      return (
        <div className="no-data">
          <span className="no-data-icon">📊</span>
          <h4>No Data Available</h4>
          <p>Connect to database and run queries to see visualizations</p>
        </div>
      );
    }

    switch (chartType) {
      case "bar":
        return <BarChart data={data} metric={selectedMetric} />;
      case "line":
        return <LineChart data={data} metric={selectedMetric} />;
      case "pie":
        return <PieChart data={data} metric={selectedMetric} />;
      case "scatter":
        return <ScatterPlot data={data} metric={selectedMetric} />;
      default:
        return <BarChart data={data} metric={selectedMetric} />;
    }
  };

  return (
    <div className="data-visualization">
      <div className="viz-header">
        <h3>Data Visualization</h3>
        <div className="viz-controls">
          <div className="chart-type-selector">
            <label>Chart Type:</label>
            <div className="chart-types">
              {chartTypes.map((type) => (
                <button
                  key={type.id}
                  className={`chart-type-btn ${
                    chartType === type.id ? "active" : ""
                  }`}
                  onClick={() => setChartType(type.id)}
                >
                  <span className="chart-icon">{type.icon}</span>
                  <span className="chart-name">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="metric-selector">
            <label>Metric:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="metric-select"
            >
              {metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="viz-content">
        <div className="chart-container">{renderChart()}</div>

        <div className="viz-code">
          <h4>Jupyter Visualization Code:</h4>
          <div className="code-preview">
            <pre>
              {`import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px

# Create ${chartType} chart
fig, ax = plt.subplots(figsize=(10, 6))

${
  chartType === "bar"
    ? `# Bar chart
df.plot(kind='bar', x='category', y='${selectedMetric}', ax=ax)
plt.title('${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      } by Category')
plt.xlabel('Category')
plt.ylabel('${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      }')
plt.xticks(rotation=45)`
    : ""
}

${
  chartType === "line"
    ? `# Line chart
plt.plot(df['timestamp'], df['${selectedMetric}'], marker='o')
plt.title('${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      } Over Time')
plt.xlabel('Time')
plt.ylabel('${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      }')
plt.xticks(rotation=45)`
    : ""
}

${
  chartType === "pie"
    ? `# Pie chart
plt.pie(df['${selectedMetric}'], labels=df['category'], autopct='%1.1f%%')
plt.title('${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      } Distribution')`
    : ""
}

${
  chartType === "scatter"
    ? `# Scatter plot
plt.scatter(df['value'], df['${selectedMetric}'], alpha=0.7)
plt.title('${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      } vs Value')
plt.xlabel('Value')
plt.ylabel('${
        selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
      }')`
    : ""
}

plt.tight_layout()
plt.show()

# Alternative: Interactive plot with Plotly
${
  chartType === "bar"
    ? `fig = px.bar(df, x='category', y='${selectedMetric}', 
           title='Interactive ${
             selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
           } Chart')`
    : ""
}
${
  chartType === "line"
    ? `fig = px.line(df, x='timestamp', y='${selectedMetric}',
            title='Interactive ${
              selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
            } Trend')`
    : ""
}
${
  chartType === "pie"
    ? `fig = px.pie(df, values='${selectedMetric}', names='category',
           title='Interactive ${
             selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
           } Distribution')`
    : ""
}
${
  chartType === "scatter"
    ? `fig = px.scatter(df, x='value', y='${selectedMetric}',
               title='Interactive ${
                 selectedMetric.charAt(0).toUpperCase() +
                 selectedMetric.slice(1)
               } Scatter Plot')`
    : ""
}
fig.show()`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple chart components
const BarChart = ({ data, metric }) => {
  const maxValue = Math.max(...data.map((d) => d[metric] || 0));

  return (
    <div className="simple-bar-chart">
      <div className="chart-title">
        {metric.charAt(0).toUpperCase() + metric.slice(1)} by Category
      </div>
      <div className="bars-container">
        {data.slice(0, 8).map((item, index) => (
          <div key={index} className="bar-group">
            <div className="bar-label">
              {item.category || item.month || `Item ${index + 1}`}
            </div>
            <div className="bar-wrapper">
              <div
                className="bar"
                style={{
                  height: `${((item[metric] || 0) / maxValue) * 200}px`,
                  backgroundColor: `hsl(${240 + index * 20}, 70%, 60%)`,
                }}
              >
                <span className="bar-value">{item[metric] || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LineChart = ({ data, metric }) => {
  const maxValue = Math.max(...data.map((d) => d[metric] || 0));

  return (
    <div className="simple-line-chart">
      <div className="chart-title">
        {metric.charAt(0).toUpperCase() + metric.slice(1)} Trend
      </div>
      <div className="line-container">
        <svg width="100%" height="300" viewBox="0 0 600 300">
          {data.slice(0, 8).map((item, index) => {
            const x = (index / (data.length - 1)) * 500 + 50;
            const y = 250 - ((item[metric] || 0) / maxValue) * 200;
            const nextItem = data[index + 1];

            return (
              <g key={index}>
                <circle cx={x} cy={y} r="4" fill="#667eea" />
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                >
                  {item[metric] || 0}
                </text>
                {nextItem && (
                  <line
                    x1={x}
                    y1={y}
                    x2={((index + 1) / (data.length - 1)) * 500 + 50}
                    y2={250 - ((nextItem[metric] || 0) / maxValue) * 200}
                    stroke="#667eea"
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const PieChart = ({ data, metric }) => {
  const total = data.reduce((sum, item) => sum + (item[metric] || 0), 0);
  let currentAngle = 0;

  return (
    <div className="simple-pie-chart">
      <div className="chart-title">
        {metric.charAt(0).toUpperCase() + metric.slice(1)} Distribution
      </div>
      <div className="pie-container">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {data.slice(0, 6).map((item, index) => {
            const value = item[metric] || 0;
            const percentage = (value / total) * 100;
            const angle = (value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;

            const x1 = 150 + 80 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 150 + 80 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 150 + 80 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 150 + 80 * Math.sin((endAngle * Math.PI) / 180);

            const largeArc = angle > 180 ? 1 : 0;
            const pathData = `M 150 150 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

            currentAngle += angle;

            return (
              <g key={index}>
                <path
                  d={pathData}
                  fill={`hsl(${240 + index * 40}, 70%, 60%)`}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={
                    150 +
                    100 *
                      Math.cos((((startAngle + endAngle) / 2) * Math.PI) / 180)
                  }
                  y={
                    150 +
                    100 *
                      Math.sin((((startAngle + endAngle) / 2) * Math.PI) / 180)
                  }
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                >
                  {percentage.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
        <div className="pie-legend">
          {data.slice(0, 6).map((item, index) => (
            <div key={index} className="legend-item">
              <div
                className="legend-color"
                style={{
                  backgroundColor: `hsl(${240 + index * 40}, 70%, 60%)`,
                }}
              ></div>
              <span>{item.category || item.month || `Item ${index + 1}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ScatterPlot = ({ data, metric }) => {
  const maxX = Math.max(...data.map((d) => d.value || 0));
  const maxY = Math.max(...data.map((d) => d[metric] || 0));

  return (
    <div className="simple-scatter-chart">
      <div className="chart-title">
        {metric.charAt(0).toUpperCase() + metric.slice(1)} vs Value
      </div>
      <div className="scatter-container">
        <svg width="100%" height="300" viewBox="0 0 500 300">
          {data.map((item, index) => {
            const x = ((item.value || 0) / maxX) * 400 + 50;
            const y = 250 - ((item[metric] || 0) / maxY) * 200;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="6"
                fill={`hsl(${240 + index * 20}, 70%, 60%)`}
                opacity="0.7"
              />
            );
          })}
          {/* Axes */}
          <line
            x1="50"
            y1="250"
            x2="450"
            y2="250"
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="250"
            stroke="#e5e7eb"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
};

export default DataVisualization;
