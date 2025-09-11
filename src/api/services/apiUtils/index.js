import apiClient from "../../handlers/axios";
// System API
export const systemAPI = {
  // Health check
  health: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Get API info
  getInfo: async () => {
    const response = await apiClient.get('/');
    return response.data;
  }
};
// Utility functions
export const apiUtils = {
  // Check if backend is accessible
  checkBackendHealth: async () => {
    try {
      await systemAPI.health();
      return true;
    } catch (error) {
      return false;
    }
  },

  // Format error messages for UI
  formatError: (error) => {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    } else if (error.response?.data?.message) {
      return error.response.data.message;
    } else if (error.message) {
      return error.message;
    } else {
      return 'An unexpected error occurred';
    }
  },

  // Download file from response
  downloadFile: (data, filename, mimeType = 'application/json') => {
    const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { 
      type: mimeType 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};