/**
 * Connection Storage Service
 * Manages saving and loading database connections from localStorage
 */

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
  saveConnection: (connection) => {
    const connections = connectionStorage.loadConnections();
    const existingIndex = connections.findIndex(conn => conn.id === connection.id);
    
    const connectionToSave = {
      ...connection,
      config: {
        ...connection.config,
        password: '' // Never save passwords
      }
    };
    
    if (existingIndex >= 0) {
      connections[existingIndex] = connectionToSave;
    } else {
      connections.push(connectionToSave);
    }
    
    connectionStorage.saveConnections(connections);
    return connections;
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
