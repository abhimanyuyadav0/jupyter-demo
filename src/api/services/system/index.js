import apiClient from "../../handlers/axios";

export const systemService = {
  health: async () => {
    const response = await apiClient.get("/health");
    return response.data;
  },

  getInfo: async () => {
    const response = await apiClient.get("/");
    return response.data;
  },
};

export default systemService;

