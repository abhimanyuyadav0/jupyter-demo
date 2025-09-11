import apiClient from "../../handlers/axios";

export const queryService = {
  execute: async (queryData) => {
    const response = await apiClient.post("/api/query/execute", queryData);
    return response.data;
  },

  getHistory: async (limit = 20, offset = 0) => {
    const response = await apiClient.get(`/api/query/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  getSamples: async () => {
    const response = await apiClient.get("/api/query/samples");
    return response.data;
  },

  validate: async (queryData) => {
    const response = await apiClient.post("/api/query/validate", queryData);
    return response.data;
  },
};

export default queryService;

