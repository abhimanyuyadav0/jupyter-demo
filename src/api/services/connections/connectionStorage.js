import apiClient from "../../handlers/axios";
import { apiUtils } from "../apiUtils";

export const connectionStorage = {
  // Back-compat alias used by existing UI
  loadConnections: async () => {
    const response = await apiClient.get("/api/credentials/connections");
    return response.data;
  },

  getAllConnections: async () => {
    const response = await apiClient.get("/api/credentials/connections");
    return response.data;
  },

  getConnectionById: async (id) => {
    const response = await apiClient.get(`/api/credentials/${id}/connection`);
    return response.data;
  },

  createConnection: async (connection) => {
    const response = await apiClient.post("/api/connections", connection);
    return response.data;
  },

  updateConnection: async (id, connection) => {
    const response = await apiClient.put(`/api/connections/${id}`, connection);
    return response.data;
  },

  removeConnection: async (id) => {
    const response = await apiClient.delete(`/api/connections/${id}`);
    return response.data;
  },

  exportConnections: async () => {
    const connections = await connectionStorage.getAllConnections();
    apiUtils.downloadFile(connections, "connections.json", "application/json");
  },

  importConnections: async (file) => {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
    try {
      const parsed = JSON.parse(text);
      // Optionally sync to backend here; for now just return parsed
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      throw new Error("Invalid JSON file");
    }
  },
};
