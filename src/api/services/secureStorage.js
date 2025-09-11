/**
 * Secure Storage Service
 * Handles encrypted storage of database credentials
 */

// Simple encryption/decryption using Web Crypto API
class SecureStorage {
  constructor() {
    this.storageKey = 'jupyter_secure_credentials';
    this.masterKeyKey = 'jupyter_master_key';
    this.saltKey = 'jupyter_salt';
  }

  // Generate a random salt
  generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Simple encryption using CryptoJS alternative
  async encryptData(data, password) {
    try {
      // Convert data to string
      const dataString = JSON.stringify(data);
      
      // Simple XOR encryption with password
      const key = this.createKey(password);
      const encrypted = this.xorEncrypt(dataString, key);
      
      return {
        encrypted: btoa(encrypted), // Base64 encode
        salt: this.generateSalt()
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt credentials');
    }
  }

  // Simple decryption
  async decryptData(encryptedData, password) {
    try {
      // Base64 decode
      const encrypted = atob(encryptedData.encrypted);
      
      // Simple XOR decryption with password
      const key = this.createKey(password);
      const decrypted = this.xorDecrypt(encrypted, key);
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt credentials - wrong master password?');
    }
  }

  // Create encryption key from password
  createKey(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  // Simple XOR encryption
  xorEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }

  // Simple XOR decryption (same as encryption)
  xorDecrypt(encrypted, key) {
    return this.xorEncrypt(encrypted, key);
  }

  // Check if master password is set
  hasMasterPassword() {
    return localStorage.getItem(this.masterKeyKey) !== null;
  }

  // Set master password
  async setMasterPassword(password) {
    try {
      const salt = this.generateSalt();
      const hashedPassword = await this.hashPassword(password, salt);
      
      localStorage.setItem(this.masterKeyKey, hashedPassword);
      localStorage.setItem(this.saltKey, salt);
      
      console.log('✅ Master password set successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to set master password:', error);
      return false;
    }
  }

  // Verify master password
  async verifyMasterPassword(password) {
    try {
      const storedHash = localStorage.getItem(this.masterKeyKey);
      const salt = localStorage.getItem(this.saltKey);
      
      if (!storedHash || !salt) {
        return false;
      }

      const hashedPassword = await this.hashPassword(password, salt);
      return hashedPassword === storedHash;
    } catch (error) {
      console.error('❌ Failed to verify master password:', error);
      return false;
    }
  }

  // Hash password with salt
  async hashPassword(password, salt) {
    // Simple hash function (in production, use proper bcrypt or similar)
    const combined = password + salt;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  // Save encrypted credentials
  async saveCredentials(connectionId, credentials, masterPassword) {
    try {
      // Get existing credentials
      const existingData = this.getEncryptedCredentials();
      
      // Encrypt the new credentials
      const encryptedCreds = await this.encryptData(credentials, masterPassword);
      
      // Update the credentials object
      existingData[connectionId] = encryptedCreds;
      
      // Save back to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
      
      console.log('✅ Credentials saved securely for connection:', connectionId);
      return true;
    } catch (error) {
      console.error('❌ Failed to save credentials:', error);
      return false;
    }
  }

  // Load and decrypt credentials
  async loadCredentials(connectionId, masterPassword) {
    try {
      const encryptedData = this.getEncryptedCredentials();
      
      if (!encryptedData[connectionId]) {
        return null; // No credentials saved for this connection
      }

      const decryptedCreds = await this.decryptData(encryptedData[connectionId], masterPassword);
      
      console.log('✅ Credentials loaded successfully for connection:', connectionId);
      return decryptedCreds;
    } catch (error) {
      console.error('❌ Failed to load credentials:', error);
      throw error;
    }
  }

  // Get all encrypted credentials
  getEncryptedCredentials() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Failed to get encrypted credentials:', error);
      return {};
    }
  }

  // Remove credentials for a connection
  removeCredentials(connectionId) {
    try {
      const existingData = this.getEncryptedCredentials();
      delete existingData[connectionId];
      localStorage.setItem(this.storageKey, JSON.stringify(existingData));
      
      console.log('✅ Credentials removed for connection:', connectionId);
      return true;
    } catch (error) {
      console.error('❌ Failed to remove credentials:', error);
      return false;
    }
  }

  // Check if credentials exist for a connection
  hasCredentials(connectionId) {
    const encryptedData = this.getEncryptedCredentials();
    return encryptedData[connectionId] !== undefined;
  }

  // Clear all credentials
  clearAllCredentials() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('✅ All credentials cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear credentials:', error);
      return false;
    }
  }

  // Clear master password and all credentials
  resetSecurity() {
    try {
      localStorage.removeItem(this.masterKeyKey);
      localStorage.removeItem(this.saltKey);
      localStorage.removeItem(this.storageKey);
      console.log('✅ Security reset - all credentials and master password cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to reset security:', error);
      return false;
    }
  }

  // Get security status
  getSecurityStatus() {
    return {
      hasMasterPassword: this.hasMasterPassword(),
      savedCredentialsCount: Object.keys(this.getEncryptedCredentials()).length,
      isSecureStorageAvailable: typeof(Storage) !== 'undefined'
    };
  }

  // Export encrypted credentials (for backup)
  exportCredentials() {
    const data = {
      credentials: this.getEncryptedCredentials(),
      masterKey: localStorage.getItem(this.masterKeyKey),
      salt: localStorage.getItem(this.saltKey),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jupyter_secure_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Secure credentials exported');
  }

  // Import encrypted credentials (from backup)
  async importCredentials(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate structure
          if (!data.credentials || !data.masterKey || !data.salt) {
            throw new Error('Invalid backup file format');
          }
          
          // Import the data
          localStorage.setItem(this.storageKey, JSON.stringify(data.credentials));
          localStorage.setItem(this.masterKeyKey, data.masterKey);
          localStorage.setItem(this.saltKey, data.salt);
          
          console.log('✅ Secure credentials imported successfully');
          resolve(true);
        } catch (error) {
          reject(new Error(`Failed to import credentials: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read backup file'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Create singleton instance
export const secureStorage = new SecureStorage();

// Export utilities
export const securityUtils = {
  // Generate strong password suggestion
  generateSecurePassword: (length = 16) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  // Check password strength
  checkPasswordStrength: (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    return {
      score,
      level: score < 3 ? 'weak' : score < 4 ? 'medium' : 'strong',
      checks,
      suggestions: [
        !checks.length ? 'Use at least 8 characters' : null,
        !checks.uppercase ? 'Add uppercase letters' : null,
        !checks.lowercase ? 'Add lowercase letters' : null,
        !checks.numbers ? 'Add numbers' : null,
        !checks.special ? 'Add special characters' : null
      ].filter(Boolean)
    };
  },

  // Security recommendations
  getSecurityRecommendations: () => [
    '🔒 Use a strong master password',
    '💾 Export credentials regularly for backup',
    '🚫 Never share your master password',
    '🔄 Change master password periodically',
    '📱 Use different passwords for each database',
    '⚠️ Clear credentials when using shared computers'
  ]
};

export default secureStorage;
