import React, { useState } from "react";
import { connectionStorage } from "../../api/services/connections/connectionStorage";
import { databaseService as databaseAPI } from "../../api/services/database";
import { credentialsService as credentialsAPI } from "../../api/services/credentials";
import { apiUtils } from "../../api/services/apiUtils";
import ConnectionModal from "./ConnectionModal";
import "./ConnectionManager.css";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ConnectionManager = ({
  onConnectionSelect,
  showNewConnection = false,
  connections,
  loadingConnections,
  refetchConnections,
  serverError,
  setSelectedDatabase,
  selectedDatabase,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingConnection, setEditingConnection] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectingTo, setConnectingTo] = useState(null);

  console.log("connections:", connections);

  const handleSelectConnection = (connection) => {
    // Just select the connection, don't connect automatically
    setSelectedDatabase(connection);

    // Notify parent component
    if (onConnectionSelect) {
      onConnectionSelect(connection);
    }
  };

  const handleConnectToSelected = async (connection) => {
    if (!connection) return;

    setConnectingTo(connection.id);

    try {

      let connectionData = {
        ...connection.config,
        db_type: connection.type,
      };

      // Try to load secure credentials if available
      if (connection.hasSecureCredentials) {
        try {
          // Get connection with password from backend
          const connectionWithPassword =
            await credentialsAPI.getConnectionWithPassword(connection.id);
          connectionData = {
            ...connectionWithPassword.config,
            db_type: connectionWithPassword.type,
          };

          console.log("🔓 Credentials loaded from backend");
        } catch (error) {
          console.warn(
            "⚠️ Failed to load secure credentials from backend:",
            error
          );
          // Fall back to manual password entry
          const password = prompt(
            `Failed to load saved credentials. Enter password for ${connection.name}:`
          );
          if (!password) {
            setConnectingTo(null);
            return;
          }
          connectionData.password = password;
        }
      } else {
        // No saved credentials, prompt for password
        if (!connectionData.password) {
          const password = prompt(`Enter password for ${connection.name}:`);
          if (!password) {
            setConnectingTo(null);
            return;
          }
          connectionData.password = password;
        }
      }

      const result = await databaseAPI.connect(connectionData);

      if (result.status === "success") {
        if (refetchConnections) {
          // Give backend a moment to persist last_used, then refetch
          setTimeout(() => {
            refetchConnections();
          }, 300);
        }

        console.log("✅ Connected to saved database:", connection.name);
      } else {
        throw new Error(result.message || "Connection failed");
      }
    } catch (error) {
     

      const errorMessage = apiUtils.formatError(error);
     
      console.error("❌ Connection failed:", errorMessage);
    }

    setConnectingTo(null);
  };

  const handleDisconnectFromSelected = async (connection) => {
    if (!connection) return;

    try {
      await databaseAPI.disconnect();

      console.log("✅ Disconnected from database:", connection.name);
      if (refetchConnections) {
        setTimeout(() => {
          refetchConnections();
        }, 200);
      }
    } catch (error) {
      console.warn("⚠️ Error disconnecting:", error);
      // Force disconnect in UI even if API call failed
     
    }
  };

  const deleteConnection = useMutation({
    mutationFn: (connectionId) =>
      connectionStorage.removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });
  const handleDeleteConnection = (connectionId) => {
    deleteConnection.mutate(connectionId);
  };

  const handleRenameConnection = (connectionId, newName) => {
    if (newName.trim()) {
      setEditingConnection(null);
    }
  };

  const handleExportConnections = () => {
    connectionStorage.exportConnections();
  };

  const handleImportConnections = (event) => {
    const file = event.target.files[0];
    if (file) {
      connectionStorage
        .importConnections(file)
        .then((connections) => {
          console.log("✅ Connections imported successfully");
        })
        .catch((error) => {
          console.error("❌ Import failed:", error);
        });
    }
  };

  const getConnectionStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "disconnected":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";

    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleDoubleClick = async (connection) => {
    console.log("🔍 handleDoubleClick called with connection:", connection);
    console.log("🔍 hasSecureCredentials:", connection.hasSecureCredentials);
    console.log(
      "🔍 typeof hasSecureCredentials:",
      typeof connection.hasSecureCredentials
    );

    try {
      // If connection has secure credentials, connect automatically
      if (connection.hasSecureCredentials) {
        console.log(
          "🔍 Connection has secure credentials, proceeding with auto-connect"
        );
        setConnectingTo(connection.id);
        

        // Get connection with password from backend
        const connectionWithPassword =
          await credentialsAPI.getConnectionWithPassword(connection.id);

        let connectionData = {
          ...connectionWithPassword.config,
          db_type: connectionWithPassword.type,
        };

        // Test the connection
        const testResult = await databaseAPI.testConnection(connectionData);

        if (testResult.success) {
         refetchConnections();
          console.log("✅ Auto-connected using saved credentials");
        } else {
          throw new Error(testResult.error || "Connection test failed");
        }
      }

   
      if (onConnectionSelect) {
        onConnectionSelect(connection);
      }

      console.log(`🚀 Navigating to /database/${connection.id}`);
      console.log(
        "Current location before navigate:",
        window.location.pathname
      );
      navigate(`/database/${connection.id}`);
      console.log("Navigate called, checking location after...");
      setTimeout(() => {
        console.log("Location after navigate:", window.location.pathname);
      }, 100);
    } catch (error) {
      console.error("❌ Auto-connection failed:", error);
     

      // Still navigate even if connection failed
     
      if (onConnectionSelect) {
        onConnectionSelect(connection);
      }

      console.log(
        `🚀 Navigating to /database/${connection.id} (despite connection error)`
      );
      navigate(`/database/${connection.id}`);
    } finally {
      setConnectingTo(null);
    }
  };
  // (Removed duplicate handleDoubleClick with incomplete code)
  return (
    <div className="connection-manager">
      <div className="manager-header">
        <h3>Database Connections</h3>
        <div className="manager-actions">
          {selectedDatabase && (
            <>
              {selectedDatabase.status === "connected" ? (
                <button
                  className="disconnect-current-btn"
                  onClick={() =>
                    handleDisconnectFromSelected(selectedDatabase)
                  }
                  disabled={connectingTo === selectedDatabase.id}
                >
                  <span className="btn-icon">🔌</span>
                  Disconnect
                </button>
              ) : (
                <button
                  className="connect-current-btn"
                  onClick={() => handleConnectToSelected(selectedDatabase)}
                  disabled={connectingTo === selectedDatabase.id}
                >
                  {connectingTo === selectedDatabase.id ? (
                    <>
                      <span className="spinner"></span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🔗</span>
                      Connect
                    </>
                  )}
                </button>
              )}
            </>
          )}
          <button
            className="new-connection-btn"
            onClick={() => setShowConnectionModal(true)}
          >
            <span className="btn-icon">➕</span>
            New Connection
          </button>
          <button
            className="import-export-btn"
            onClick={() => setShowImportExport(!showImportExport)}
          >
            <span className="btn-icon">📁</span>
            Import/Export
          </button>
        </div>
      </div>

      {showImportExport && (
        <div className="import-export-section">
          <button className="export-btn" onClick={handleExportConnections}>
            <span className="btn-icon">📤</span>
            Export Connections
          </button>
          <label className="import-btn">
            <span className="btn-icon">📥</span>
            Import Connections
            <input
              type="file"
              accept=".json"
              onChange={handleImportConnections}
              style={{ display: "none" }}
            />
          </label>
        </div>
      )}

      <div className="connections-list">
        {serverError && (
          <div
            className="no-connections"
            style={{ background: "#fef2f2", border: "2px solid #fecaca" }}
          >
            <span className="no-conn-icon">⚠️</span>
            <p style={{ color: "#991b1b" }}>
              Failed to load server connections
            </p>
            <p className="no-conn-help" style={{ color: "#b91c1c" }}>
              {serverError}
            </p>
          </div>
        )}
        {loadingConnections && (
          <div className="no-connections">
            <span className="no-conn-icon">⏳</span>
            <p>Loading connections…</p>
            <p className="no-conn-help">
              Fetching from server and local storage
            </p>
          </div>
        )}
        {!loadingConnections && connections.length === 0 ? (
          <div className="no-connections">
            <span className="no-conn-icon">🔌</span>
            <p>No saved connections</p>
            <p className="no-conn-help">
              Connect to a database and check "Save credentials"
            </p>
          </div>
        ) : (
          !loadingConnections && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                width: "100%",
                padding: "10px",
              }}
            >
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className={`connection-card ${
                    selectedDatabase?.id === connection.id ? "selected" : ""
                  } ${connection.status}`}
                >
                  <div className="card-header">
                    <div className="card-status">
                      <span className="status-indicator">
                        {getConnectionStatusIcon(connection.status)}
                      </span>
                      <span className="connection-type-badge">
                        {connection.type}
                      </span>
                    </div>

                    <div className="card-actions">
                      <button
                        className="edit-btn"
                        onClick={(e) => {
                          navigate(`/database/${connection.id}`);
                        }}
                        title="View connection"
                        style={{
                          background: "orange",
                          color: "white",
                          marginRight: "5px",
                          fontSize: "12px",
                        }}
                      >
                        👁️
                      </button>
                      <button
                        className="edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingConnection(connection.id);
                        }}
                        title="Rename connection"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConnection(connection.id);
                        }}
                        title="Delete connection"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div
                    className="card-content"
                    onClick={() => {
                      console.log(
                        "🖱️ Single click detected, selecting connection"
                      );
                      handleSelectConnection(connection);
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(
                        "🖱️ Double-click detected on connection:",
                        connection.name,
                        connection.id
                      );
                      console.log("Connection object:", connection);
                      console.log(
                        "Connection hasSecureCredentials:",
                        connection.hasSecureCredentials
                      );
                      // Navigate to explorer page on double click
                      handleDoubleClick(connection);
                    }}
                  >
                    {editingConnection === connection.id ? (
                      <input
                        type="text"
                        defaultValue={connection.name}
                        className="connection-name-input"
                        onBlur={(e) =>
                          handleRenameConnection(connection.id, e.target.value)
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleRenameConnection(
                              connection.id,
                              e.target.value
                            );
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <h4 className="connection-name" title={connection.name}>
                        {connection.name}
                      </h4>
                    )}

                    <div className="connection-details">
                      <span className="connection-host">
                        {connection.config.host}:{connection.config.port}
                      </span>
                      <span className="connection-database">
                        📊 {connection.config.database}
                      </span>
                      <div className="connection-meta">
                        <span className="connection-time">
                          🕒 {getTimeAgo(connection.lastConnected)}
                        </span>
                        {connection.hasSecureCredentials && (
                          <span
                            className="secure-indicator"
                            title="Credentials saved securely"
                          >
                            🔒 Secure
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedDatabase?.id === connection.id && (
                    <div className="selected-indicator">
                      <span>✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showNewConnection && (
        <div className="new-connection-hint">
          <p>
            💡 Use "New Connection" to add databases. Check "Save credentials
            securely" to store them automatically.
          </p>
        </div>
      )}

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onSuccess={(newConnection) => {
          console.log(
            "✅ New connection created:",
            newConnection.name || "Temporary connection"
          );
        }}
      />
    </div>
  );
};

export default ConnectionManager;
