import apiClient from "../../handlers/axios";

export const analyticsService = {
  getMetrics: async () => {
    const response = await apiClient.get("/api/analytics/metrics");
    return response.data;
  },

  generateChart: async (chartData) => {
    const response = await apiClient.post("/api/analytics/chart", chartData);
    return response.data;
  },

  exportNotebook: async (exportData) => {
    const response = await apiClient.post("/api/analytics/export/notebook", exportData);
    return response.data;
  },

  getInsights: async (query) => {
    const response = await apiClient.get(`/api/analytics/insights?query=${encodeURIComponent(query)}`);
    return response.data;
  },
};

export default analyticsService;

