import apiClient from "../../handlers/axios";

export const databaseService = {
  connect: async (connectionData) => {
    const requestData = {
      ...connectionData,
      save_credentials: connectionData.save_credentials || false,
      connection_name: connectionData.connection_name || "",
    };
    const response = await apiClient.post("/api/database/connect", requestData);
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get("/api/database/status");
    return response.data;
  },

  disconnect: async () => {
    const response = await apiClient.post("/api/database/disconnect");
    return response.data;
  },

  getSchema: async () => {
    const response = await apiClient.get("/api/database/schema");
    return response.data;
  },

  getTableStats: async (tableName) => {
    const response = await apiClient.get(`/api/database/tables/${tableName}/stats`);
    return response.data;
  },
  
  testConnection: async (connectionData) => {
    // If backend doesn't support a dedicated endpoint, consider using connect in dry-run mode
    try {
      const response = await apiClient.post("/api/database/test-connection", connectionData);
      return response.data;
    } catch (e) {
      // Fallback: try connect and treat status as success
      const result = await databaseService.connect({ ...connectionData, save_credentials: false });
      if (result?.status === "success") {
        return { success: true };
      }
      throw e;
    }
  },
};

export default databaseService;

