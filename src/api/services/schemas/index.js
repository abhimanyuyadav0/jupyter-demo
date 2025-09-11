import apiClient from "../../handlers/axios"

export const getSchema = async () => {
  const response = await apiClient.get("/api/schemas")
  return response.data
}

export const getSchemaById = async (id) => {
  const response = await apiClient.get(`/api/schemas/${id}`)
  return response.data
}

export const createSchema = async (schema) => {
  const response = await apiClient.post("/api/schemas", schema)
  return response.data
}