/**
 * API Service Layer for Backend Communication
 */

import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 500) {
      console.error('🔥 Server Error - Check backend logs');
    } else if (error.response?.status === 404) {
      console.error('🔍 API Endpoint Not Found');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Cannot connect to backend - Is it running on port 8000?');
    }
    
    return Promise.reject(error);
  }
);

// Database API
export const databaseAPI = {
  // Test connection with optional credential saving
  connect: async (connectionData) => {
    // Include credential saving in connection request
    const requestData = {
      ...connectionData,
      save_credentials: connectionData.save_credentials || false,
      connection_name: connectionData.connection_name || ''
    };
    
    const response = await apiClient.post('/api/database/connect', requestData);
    return response.data;
  },

  // Get connection status
  getStatus: async () => {
    const response = await apiClient.get('/api/database/status');
    return response.data;
  },

  // Disconnect
  disconnect: async () => {
    const response = await apiClient.post('/api/database/disconnect');
    return response.data;
  },

  // Get database schema
  getSchema: async () => {
    const response = await apiClient.get('/api/database/schema');
    return response.data;
  },

  // Get table statistics
  getTableStats: async (tableName) => {
    const response = await apiClient.get(`/api/database/tables/${tableName}/stats`);
    return response.data;
  }
};

// Credentials API
export const credentialsAPI = {
  // Save credentials
  save: async (credentialData) => {
    const response = await apiClient.post('/api/credentials/save', credentialData);
    return response.data;
  },

  // List saved credentials
  list: async () => {
    const response = await apiClient.get('/api/credentials/list');
    return response.data;
  },

  // Get connections for frontend
  getConnections: async () => {
    const response = await apiClient.get('/api/credentials/connections');
    return response.data;
  },

  // Get credential password
  getPassword: async (credentialId) => {
    const response = await apiClient.get(`/api/credentials/${credentialId}/password`);
    return response.data;
  },

  // Get connection with password
  getConnectionWithPassword: async (credentialId) => {
    const response = await apiClient.get(`/api/credentials/${credentialId}/connection`);
    return response.data;
  },

  // Delete credential
  delete: async (credentialId) => {
    const response = await apiClient.delete(`/api/credentials/${credentialId}`);
    return response.data;
  },

  // Check for duplicates
  checkDuplicate: async (connectionData) => {
    const response = await apiClient.post('/api/credentials/check-duplicate', connectionData);
    return response.data;
  },

  // Get audit logs
  getAudit: async (credentialId, limit = 50) => {
    const response = await apiClient.get(`/api/credentials/${credentialId}/audit?limit=${limit}`);
    return response.data;
  },

  // Get all audit logs
  getAllAudit: async (limit = 100) => {
    const response = await apiClient.get(`/api/credentials/audit/all?limit=${limit}`);
    return response.data;
  }
};

// Query API
export const queryAPI = {
  // Execute SQL query
  execute: async (queryData) => {
    const response = await apiClient.post('/api/query/execute', queryData);
    return response.data;
  },

  // Get query history
  getHistory: async (limit = 20, offset = 0) => {
    const response = await apiClient.get(`/api/query/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get sample queries
  getSamples: async () => {
    const response = await apiClient.get('/api/query/samples');
    return response.data;
  },

  // Validate query
  validate: async (queryData) => {
    const response = await apiClient.post('/api/query/validate', queryData);
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  // Get live metrics
  getMetrics: async () => {
    const response = await apiClient.get('/api/analytics/metrics');
    return response.data;
  },

  // Generate chart
  generateChart: async (chartData) => {
    const response = await apiClient.post('/api/analytics/chart', chartData);
    return response.data;
  },

  // Export to Jupyter notebook
  exportNotebook: async (exportData) => {
    const response = await apiClient.post('/api/analytics/export/notebook', exportData);
    return response.data;
  },

  // Get automated insights
  getInsights: async (query) => {
    const response = await apiClient.get(`/api/analytics/insights?query=${encodeURIComponent(query)}`);
    return response.data;
  }
};

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

// WebSocket Management
export class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.listeners = new Map();
  }

  connect() {
    try {
      const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws';
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyListeners('connected', { status: 'connected' });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);
          this.notifyListeners('message', data);
          
          // Handle specific message types
          if (data.type) {
            this.notifyListeners(data.type, data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.notifyListeners('disconnected', { status: 'disconnected' });
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.notifyListeners('error', { error });
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(messageStr);
      console.log('📤 WebSocket sent:', message);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message:', message);
    }
  }

  // Message type helpers
  startStream() {
    this.send({ type: 'start_stream' });
  }

  stopStream() {
    this.send({ type: 'stop_stream' });
  }

  executeQuery(query) {
    this.send({ type: 'execute_query', query });
  }

  ping() {
    this.send({ type: 'ping' });
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in WebSocket listener for ${event}:`, error);
        }
      });
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('💔 Max reconnection attempts reached');
      this.notifyListeners('max_reconnect_attempts', { attempts: this.reconnectAttempts });
    }
  }

  getConnectionState() {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'CONNECTED';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'DISCONNECTED';
      default: return 'UNKNOWN';
    }
  }
}

// Export singleton instance
export const websocketManager = new WebSocketManager();

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

export default apiClient;
