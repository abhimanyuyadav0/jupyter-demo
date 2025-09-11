/**
 * Connection Storage Service
 * Manages saving and loading database connections from localStorage
 */

import { secureStorage } from '../secureStorage';

const STORAGE_KEY = 'jupyter_database_connections';

export const connectionStorage = {
  /**
   * Save connections to localStorage
   */
  saveConnections: (connections) => {
    try {
      // Don't save passwords for security
      const connectionsToSave = connections.map(conn => ({
        ...conn,
        config: {
          ...conn.config,
          password: '' // Never save passwords
        }
      }));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connectionsToSave));
      console.log('✅ Saved connections to localStorage');
    } catch (error) {
      console.error('❌ Failed to save connections:', error);
    }
  },

  /**
   * Load connections from localStorage
   */
  loadConnections: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const connections = JSON.parse(stored);
        console.log(`✅ Loaded ${connections.length} saved connections`);
        return connections;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to load connections:', error);
      return [];
    }
  },

  /**
   * Add or update a single connection
   */
  saveConnection: (connection, saveCredentials = false, masterPassword = null) => {
    const connections = connectionStorage.loadConnections();
    const existingIndex = connections.findIndex(conn => conn.id === connection.id);
    
    const connectionToSave = {
      ...connection,
      config: {
        ...connection.config,
        password: '' // Never save passwords in plain text
      },
      hasSecureCredentials: false
    };

    // Save credentials securely if requested
    if (saveCredentials && masterPassword && connection.config.password) {
      try {
        const credentialsToSave = {
          username: connection.config.username,
          password: connection.config.password
        };
        
        secureStorage.saveCredentials(connection.id, credentialsToSave, masterPassword);
        connectionToSave.hasSecureCredentials = true;
        console.log('✅ Credentials saved securely for connection:', connection.name);
      } catch (error) {
        console.warn('⚠️ Failed to save credentials securely:', error);
      }
    }
    
    if (existingIndex >= 0) {
      connections[existingIndex] = connectionToSave;
    } else {
      connections.push(connectionToSave);
    }
    
    connectionStorage.saveConnections(connections);
    return connections;
  },

  /**
   * Load connection with secure credentials
   */
  loadConnectionWithCredentials: async (connectionId, masterPassword) => {
    try {
      const connections = connectionStorage.loadConnections();
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Load secure credentials if available
      if (connection.hasSecureCredentials && masterPassword) {
        try {
          const credentials = await secureStorage.loadCredentials(connectionId, masterPassword);
          if (credentials) {
            return {
              ...connection,
              config: {
                ...connection.config,
                username: credentials.username,
                password: credentials.password
              }
            };
          }
        } catch (error) {
          console.warn('⚠️ Failed to load secure credentials:', error);
          throw error;
        }
      }

      return connection;
    } catch (error) {
      console.error('❌ Failed to load connection with credentials:', error);
      throw error;
    }
  },

  /**
   * Check if connection has saved credentials
   */
  hasSecureCredentials: (connectionId) => {
    return secureStorage.hasCredentials(connectionId);
  },

  /**
   * Remove secure credentials for a connection
   */
  removeSecureCredentials: (connectionId) => {
    return secureStorage.removeCredentials(connectionId);
  },

  /**
   * Update connection to mark credentials as saved
   */
  markCredentialsSaved: (connectionId) => {
    const connections = connectionStorage.loadConnections();
    const connectionIndex = connections.findIndex(conn => conn.id === connectionId);
    
    if (connectionIndex >= 0) {
      connections[connectionIndex].hasSecureCredentials = true;
      connectionStorage.saveConnections(connections);
      return true;
    }
    return false;
  },

  /**
   * Update connection to mark credentials as removed
   */
  markCredentialsRemoved: (connectionId) => {
    const connections = connectionStorage.loadConnections();
    const connectionIndex = connections.findIndex(conn => conn.id === connectionId);
    
    if (connectionIndex >= 0) {
      connections[connectionIndex].hasSecureCredentials = false;
      connectionStorage.saveConnections(connections);
      return true;
    }
    return false;
  },

  /**
   * Remove a connection by ID
   */
  removeConnection: (connectionId) => {
    const connections = connectionStorage.loadConnections();
    const filtered = connections.filter(conn => conn.id !== connectionId);
    connectionStorage.saveConnections(filtered);
    return filtered;
  },

  /**
   * Clear all saved connections
   */
  clearConnections: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ Cleared all saved connections');
    } catch (error) {
      console.error('❌ Failed to clear connections:', error);
    }
  },

  /**
   * Export connections to JSON file
   */
  exportConnections: () => {
    const connections = connectionStorage.loadConnections();
    const dataStr = JSON.stringify(connections, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jupyter_connections_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Import connections from JSON file
   */
  importConnections: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const connections = JSON.parse(e.target.result);
          
          // Validate structure
          if (!Array.isArray(connections)) {
            throw new Error('Invalid file format');
          }
          
          // Merge with existing connections
          const existing = connectionStorage.loadConnections();
          const merged = [...existing];
          
          connections.forEach(importedConn => {
            // Generate new ID to avoid conflicts
            const newConnection = {
              ...importedConn,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: `${importedConn.name} (Imported)`,
              status: 'disconnected',
              lastConnected: null
            };
            merged.push(newConnection);
          });
          
          connectionStorage.saveConnections(merged);
          resolve(merged);
        } catch (error) {
          reject(new Error(`Failed to import connections: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  },

  /**
   * Generate a connection name based on config
   */
  generateConnectionName: (config, type) => {
    const timestamp = new Date().toLocaleString();
    
    if (type === 'postgresql' || type === 'mysql') {
      return `${config.database}@${config.host}:${config.port}`;
    } else if (type === 'mongodb') {
      return `MongoDB ${config.database}@${config.host}:${config.port}`;
    } else if (type === 'sqlite') {
      return `SQLite ${config.database}`;
    } else {
      return `Database Connection ${timestamp}`;
    }
  },

  /**
   * Validate connection configuration
   */
  validateConnection: (config, type) => {
    const errors = [];
    
    if (!config.host || config.host.trim() === '') {
      errors.push('Host is required');
    }
    
    if (!config.database || config.database.trim() === '') {
      errors.push('Database name is required');
    }
    
    if (type !== 'sqlite') {
      if (!config.port || isNaN(parseInt(config.port))) {
        errors.push('Valid port number is required');
      }
      
      if (!config.username || config.username.trim() === '') {
        errors.push('Username is required');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export default connectionStorage;
