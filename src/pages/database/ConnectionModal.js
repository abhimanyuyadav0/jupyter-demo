import React, { useState, useEffect } from "react";
import { databaseService as databaseAPI } from "../../api/services/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUtils } from "../../api/services/apiUtils";
import "./ConnectionModal.css";

const ConnectionModal = ({ isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [connectionConfig, setLocalConnectionConfig] = useState({
    host: "localhost",
    port: "5432",
    database: "jupyter_db",
    username: "postgres",
    password: "",
  });
  const [selectedType, setSelectedType] = useState("postgresql");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionName, setConnectionName] = useState("");
  const [saveCredentials, setSaveCredentials] = useState(false);

  const databaseTypes = [
    {
      id: "postgresql",
      name: "PostgreSQL",
      icon: "🐘",
      port: "5432",
      color: "#336791",
    },
    { id: "mysql", name: "MySQL", icon: "🐬", port: "3306", color: "#4479A1" },
    {
      id: "mongodb",
      name: "MongoDB",
      icon: "🍃",
      port: "27017",
      color: "#47A248",
    },
    { id: "sqlite", name: "SQLite", icon: "💎", port: "N/A", color: "#003B57" },
  ];

  useEffect(() => {
    if (isOpen) {
      setSelectedType("postgresql");
      setIsConnecting(false);
      setConnectionError(null);
      setIsConnected(false);
      setConnectionName("");
      setSaveCredentials(false);
    }
  }, [isOpen]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    const dbType = databaseTypes.find((db) => db.id === type);
    if (dbType && dbType.port !== "N/A") {
      setLocalConnectionConfig((prev) => ({ ...prev, port: dbType.port }));
    }
  };

  const handleConfigChange = (field, value) => {
    setLocalConnectionConfig((prev) => ({ ...prev, [field]: value }));
  };

  const connectMutation = useMutation({
    mutationFn: (connectionData) => databaseAPI.connect(connectionData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      console.log("✅ Successfully connected to database:", data);
    },
    onError: (error) => {
      console.error("❌ Database connection failed:", error);
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Generate connection name for backend
      const finalConnectionName =
        connectionName.trim() ||
        `${connectionConfig.database}@${connectionConfig.host}:${connectionConfig.port}`;

      const connectionData = {
        host: connectionConfig.host,
        port: parseInt(connectionConfig.port),
        database: connectionConfig.database,
        username: connectionConfig.username,
        password: connectionConfig.password,
        db_type: selectedType,
        save_credentials: saveCredentials,
        connection_name: finalConnectionName,
      };

      const result = await connectMutation.mutateAsync(connectionData);

      if (result.status === "success") {
        setIsConnected(true);

        // Create connection object for frontend
        const connectionId =
          result.credential_info?.id || Date.now().toString();
        const newConnection = {
          id: connectionId,
          name: finalConnectionName,
          config: {
            ...connectionConfig,
            password: "", // Don't store password in Redux
          },
          type: selectedType,
          status: "connected",
          lastConnected: new Date().toISOString(),
          hasSecureCredentials:
            result.credential_saved || result.credential_duplicate,
        };
        console.log(
          "✅ Successfully connected to database:",
          result.connection_info
        );

        if (result.credential_saved) {
          console.log("🔒 Credentials saved securely to backend");
        } else if (result.credential_duplicate) {
          console.log("🔄 Credentials already exist in backend");
        }

        // Call success callback and close modal immediately
        if (onSuccess) {
          onSuccess(newConnection);
        }
        onClose();
      } else {
        throw new Error(result.message || "Connection failed");
      }
    } catch (error) {
      const errorMessage = apiUtils.formatError(error);
      setConnectionError(errorMessage);
      console.error("❌ Database connection failed:", error);
    }
    setIsConnecting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="connection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Database Connection</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          {/* Database Type Selection */}
          <div className="section">
            <h3>Select Database Type</h3>
            <div className="db-type-grid">
              {databaseTypes.map((db) => (
                <button
                  key={db.id}
                  className={`db-type-card ${
                    selectedType === db.id ? "selected" : ""
                  }`}
                  onClick={() => handleTypeChange(db.id)}
                  disabled={isConnecting}
                  style={{ "--db-color": db.color }}
                >
                  <span className="db-icon">{db.icon}</span>
                  <span className="db-name">{db.name}</span>
                  <span className="db-port">Port: {db.port}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Configuration */}
          <div className="section">
            <h3>Connection Details</h3>
            <div className="connection-form-grid">
              <div className="form-row">
                <div className="form-field">
                  <label>Host</label>
                  <input
                    type="text"
                    value={connectionConfig.host}
                    onChange={(e) => handleConfigChange("host", e.target.value)}
                    placeholder="localhost"
                    disabled={isConnecting || isConnected}
                  />
                </div>
                <div className="form-field">
                  <label>Port</label>
                  <input
                    type="text"
                    value={connectionConfig.port}
                    onChange={(e) => handleConfigChange("port", e.target.value)}
                    placeholder="5432"
                    disabled={
                      isConnecting || isConnected || selectedType === "sqlite"
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Database Name</label>
                <input
                  type="text"
                  value={connectionConfig.database}
                  onChange={(e) =>
                    handleConfigChange("database", e.target.value)
                  }
                  placeholder="analytics_db"
                  disabled={isConnecting || isConnected}
                />
              </div>

              <div className="form-field">
                <label>Connection Name (Optional)</label>
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="My Database Connection"
                  disabled={isConnecting || isConnected}
                />
              </div>

              {selectedType !== "sqlite" && (
                <div className="form-row">
                  <div className="form-field">
                    <label>Username</label>
                    <input
                      type="text"
                      value={connectionConfig.username}
                      onChange={(e) =>
                        handleConfigChange("username", e.target.value)
                      }
                      placeholder="username"
                      disabled={isConnecting || isConnected}
                    />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={connectionConfig.password}
                      onChange={(e) =>
                        handleConfigChange("password", e.target.value)
                      }
                      placeholder="password"
                      disabled={isConnecting || isConnected}
                    />
                  </div>
                </div>
              )}

              <div className="security-options">
                <div className="checkbox-field">
                  <input
                    type="checkbox"
                    id="saveCredentials"
                    checked={saveCredentials}
                    onChange={(e) => setSaveCredentials(e.target.checked)}
                    disabled={isConnecting || isConnected}
                  />
                  <label htmlFor="saveCredentials">
                    🔒 Save credentials securely on server (no need to enter
                    password again)
                  </label>
                </div>

                {saveCredentials && (
                  <div className="security-info">
                    <div className="info-message">
                      <span className="info-icon">🛡️</span>
                      Credentials will be encrypted and stored securely on the
                      backend server
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connection Status */}
          {connectionError && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {connectionError}
            </div>
          )}

          {isConnected && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              Successfully connected to database!
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="connect-btn"
            onClick={handleConnect}
            disabled={
              isConnecting ||
              !connectionConfig.host ||
              !connectionConfig.database
            }
          >
            {isConnecting ? (
              <>
                <span className="spinner"></span>
                Connecting...
              </>
            ) : (
              <>
                <span className="btn-icon">🔗</span>
                Connect & Close
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;
