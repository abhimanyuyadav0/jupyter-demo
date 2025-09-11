import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { databaseAPI, apiUtils } from "../../../services/api";
import {
  setActiveConnection,
  updateConnectionStatus,
  setConnectionStatus,
  setConnectionConfig,
  setConnectionType,
} from "../../../redux/slices/jupyterSlice";

const DatabaseExplorer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { liveDemo } = useSelector((state) => state.jupyter);

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  console.log("liveDemo.connections", liveDemo);
  const connection = useMemo(() => {
    return liveDemo.connections.find((c) => String(c.id) === String(id));
  }, [liveDemo.connections, id]);

  useEffect(() => {
    if (!connection) {
      alert("No connection found");
      return;
    }
    dispatch(setActiveConnection(connection.id));
  }, [connection, dispatch, navigate]);

  const ensureConnected = async () => {
    if (!connection) return false;
    if (connection.status === "connected") return true;
    try {
      dispatch(setConnectionStatus("connecting"));
      let password = connection.config.password;
      if (!password) {
        password = prompt(`Asking password? Enter password for ${connection.name}:`);
        if (!password) {
          dispatch(setConnectionStatus("disconnected"));
          return false;
        }
      }
      const result = await databaseAPI.connect({
        host: connection.config.host,
        port: parseInt(connection.config.port),
        database: connection.config.database,
        username: connection.config.username,
        password,
        db_type: connection.type,
        save_credentials: false,
        connection_name: connection.name,
      });
      if (result.status === "success") {
        dispatch(
          updateConnectionStatus({
            connectionId: connection.id,
            status: "connected",
            lastConnected: new Date().toISOString(),
          })
        );
        dispatch(setConnectionStatus("connected"));
        dispatch(setConnectionConfig(connection.config));
        dispatch(setConnectionType(connection.type));
        return true;
      }
      throw new Error(result.message || "Failed to connect");
    } catch (e) {
      setError(apiUtils.formatError(e));
      dispatch(setConnectionStatus("disconnected"));
      dispatch(
        updateConnectionStatus({
          connectionId: connection.id,
          status: "disconnected",
        })
      );
      return false;
    }
  };

  const loadTables = async () => {
    setLoading(true);
    setError("");
    try {
      const ok = await ensureConnected();
      if (!ok) {
        setLoading(false);
        return;
      }
      const schema = await databaseAPI.getSchema();
      const tableList = Array.isArray(schema?.tables)
        ? schema.tables
        : schema?.data?.tables || [];
      setTables(tableList);
    } catch (e) {
      setError(apiUtils.formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleToggleConnection = async () => {
    if (!connection) return;
    if (connection.status === "connected") {
      try {
        await databaseAPI.disconnect();
      } catch (_) {}
      dispatch(
        updateConnectionStatus({
          connectionId: connection.id,
          status: "disconnected",
        })
      );
      dispatch(setConnectionStatus("disconnected"));
    } else {
      await ensureConnected();
      await loadTables();
    }
  };
  const [expandedTable, setExpandedTable] = useState(null);

  const toggleTable = (tableName) => {
    setExpandedTable((prev) => (prev === tableName ? null : tableName));
  };
  
  if (!connection) return null;

  return (
    <div className="db-explorer" style={{ padding: "1.5rem" }}>
      <div
        className="explorer-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            {connection.name ||
              `${connection.config.database}@${connection.config.host}`}
          </h2>
          <div style={{ color: "#64748b", fontSize: 14 }}>
            {connection.type} • {connection.config.host}:
            {connection.config.port}
          </div>
        </div>
        <button
          onClick={handleToggleConnection}
          className={
            connection.status === "connected" ? "disconnect-btn" : "connect-btn"
          }
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "none",
            color: "#fff",
            background:
              connection.status === "connected" ? "#ef4444" : "#2563eb",
            fontWeight: 600,
          }}
        >
          {connection.status === "connected" ? "Disconnect" : "Connect"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading tables...</div>
      ) : (
        <div>
          <h3 style={{ marginTop: 0 }}>Tables</h3>
          {tables.length === 0 ? (
            <div style={{ color: "#64748b" }}>No tables found.</div>
          ) : (
            <div style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {tables.map((t) => (
  <div key={t.name || t}>
    <div
      style={{
        padding: "0.5rem 0",
        borderBottom: "1px solid #e5e7eb",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>{t.name || t}</span>
      <button
        onClick={() => toggleTable(t.name)}
        className="toggle-btn"
      >
        {expandedTable === t.name ? "⬆️" : "⬇️"}
      </button>
    </div>

    {expandedTable === t.name && t.columns && (
      <div
        style={{
          paddingLeft: "1rem",
          background: "#f9fafb",
          borderLeft: "3px solid #2563eb",
          marginBottom: "0.5rem",
        }}
      >
        {t.columns.map((col) => (
          <div
            key={col.name}
            style={{
              padding: "0.25rem 0",
              borderBottom: "1px dashed #e5e7eb",
              fontSize: "14px",
              color: "#334155",
            }}
          >
            <strong>{col.name}</strong> — {col.type}
            {col.nullable ? "" : " (NOT NULL)"}
            {col.default ? ` • default: ${col.default}` : ""}
          </div>
        ))}
      </div>
    )}
  </div>
))}

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseExplorer;
