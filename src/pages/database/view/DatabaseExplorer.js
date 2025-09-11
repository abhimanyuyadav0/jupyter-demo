import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { databaseService as databaseAPI } from "../../../api/services/database";
import { apiUtils } from "../../../api/services/apiUtils";
import { useQuery } from "@tanstack/react-query";
import { connectionStorage } from "../../../api/services/connections/connectionStorage";

const DatabaseExplorer = () => {
  const { id } = useParams();
  const [error, setError] = useState("");

  const {
    data: connection,
    isLoading: loading,
    refetch: refetchConnection,
  } = useQuery({
    queryKey: ["connection", id],
    enabled: !!id,
    queryFn: () => connectionStorage.getConnectionById(id),
    onError: (error) => {
      console.error(apiUtils.formatError(error));
    },
  });
  console.log("connection", connection);

  useEffect(() => {
    refetchConnection();
  }, [id, refetchConnection]);

  const { data: schema } = useQuery({
    queryKey: ["schema", id, connection?.status],
    enabled: !!connection,
    queryFn: async () => databaseAPI.getSchema(),
    onError: (e) => {
      setError(apiUtils.formatError(e));
    },
    retry: 1,
  });

  console.log("schema::", schema);

  const handleToggleConnection = async () => {};
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
          {schema?.tables?.length === 0 ? (
            <div style={{ color: "#64748b" }}>No tables found.</div>
          ) : (
            <div style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {schema?.tables?.map((t) => (
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
