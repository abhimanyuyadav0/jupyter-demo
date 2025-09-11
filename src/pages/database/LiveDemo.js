import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setError } from "../../redux/slices/jupyterSlice";
import DatabaseConnection from "./DatabaseConnection";
import QueryEditor from "./QueryEditor";
import DataVisualization from "./DataVisualization";
import AnalyticsPanel from "./AnalyticsPanel";
import "./LiveDemo.css";
import { connectionStorage } from "../../api/services/connections/connectionStorage";
import { apiUtils } from "../../api/services/apiUtils";
import { useQuery } from "@tanstack/react-query";

const LiveDemo = () => {
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);
  const [activeTab, setActiveTab] = useState("connection");
  const [serverError, setServerError] = useState("");

  const {
    data: connections,
    isLoading: loadingServerConnections,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: ["connectionss"],
    queryFn: () => connectionStorage.getAllConnections(),
    onError: (error) => {
      setServerError(apiUtils.formatError(error));
    },
  });
  const tabs = [
    { id: "connection", label: "Database Connection", icon: "🔗" },
    { id: "query", label: "Query Editor", icon: "📝" },
    { id: "visualization", label: "Data Visualization", icon: "📊" },
    { id: "analytics", label: "Live Analytics", icon: "⚡" },
  ];

  const infoData = [
    {
      icon: "🔗",
      title: "Connect to Database",
      description:
        "Simulate connections to PostgreSQL, MySQL, MongoDB, or SQLite",
    },
    {
      icon: "📝",
      title: "Write SQL Queries",
      description:
        "Interactive query editor with syntax highlighting and auto-completion",
    },
    {
      icon: "📊",
      title: "Visualize Data",
      description:
        "Create charts, graphs, and interactive visualizations from your data",
    },
    {
      icon: "⚡",
      title: "Real-time Analytics",
      description:
        "Monitor live data streams and generate insights automatically",
    },
  ];
  return (
    <div className="live-demo">
      <div className="container">
        {/* <div className="demo-header">
          <h1 className="demo-title">
            <span className="demo-icon">🚀</span>
            Live Jupyter Demo
          </h1>
          <p className="demo-description">
            Connect to your database and perform real-time analytics using
            Jupyter-like interface
          </p>
        </div> */}

        <div className="demo-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.id !== "connection" && !liveDemo.isConnected}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="demo-content">
          {activeTab === "connection" && (
            <DatabaseConnection
              connections={connections || []}
              loadingConnections={loadingServerConnections}
              refetchConnections={refetchConnections}
              serverError={serverError}
            />
          )}
          {activeTab === "query" && (
            <QueryEditor
              connections={connections || []}
              loadingConnections={loadingServerConnections}
              refetchConnections={refetchConnections}
              serverError={serverError}
            />
          )}
          {activeTab === "visualization" && (
            <DataVisualization
              connections={connections || []}
              loadingConnections={loadingServerConnections}
              refetchConnections={refetchConnections}
              serverError={serverError}
            />
          )}
          {activeTab === "analytics" && (
            <AnalyticsPanel
              connections={connections || []}
              loadingConnections={loadingServerConnections}
              refetchConnections={refetchConnections}
              serverError={serverError}
            />
          )}
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
            {infoData.map((item) => (
              <div className="info-item" key={item.title}>
                <span className="info-icon">{item.icon}</span>
                <div className="info-content">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDemo;
