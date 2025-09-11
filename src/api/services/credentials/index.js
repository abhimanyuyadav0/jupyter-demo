import apiClient from "../../handlers/axios";

export const credentialsService = {
  save: async (credentialData) => {
    const response = await apiClient.post("/api/credentials/save", credentialData);
    return response.data;
  },

  list: async () => {
    const response = await apiClient.get("/api/credentials/list");
    return response.data;
  },

  getConnections:(includeAll = false) => async () => {
    const url = includeAll ? "/api/credentials/connections?all=true" : "/api/credentials/connections";
    const response = await apiClient.get(url);
    return response.data;
  },

  getPassword: async (credentialId) => {
    const response = await apiClient.get(`/api/credentials/${credentialId}/password`);
    return response.data;
  },

  getConnectionWithPassword: async (credentialId) => {
    const response = await apiClient.get(`/api/credentials/${credentialId}/connection`);
    return response.data;
  },

  delete: async (credentialId) => {
    const response = await apiClient.delete(`/api/credentials/${credentialId}`);
    return response.data;
  },

  checkDuplicate: async (connectionData) => {
    const response = await apiClient.post("/api/credentials/check-duplicate", connectionData);
    return response.data;
  },

  getAudit: async (credentialId, limit = 50) => {
    const response = await apiClient.get(`/api/credentials/${credentialId}/audit?limit=${limit}`);
    return response.data;
  },

  getAllAudit: async (limit = 100) => {
    const response = await apiClient.get(`/api/credentials/audit/all?limit=${limit}`);
    return response.data;
  },
};

export default credentialsService;

