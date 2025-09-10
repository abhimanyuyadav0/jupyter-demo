"""
Server-side encryption service for database credentials
"""

import os
import secrets
import hashlib
import base64
from typing import Tuple, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class CredentialEncryption:
    """
    Handle encryption and decryption of database credentials
    """
    
    def __init__(self, master_key: Optional[str] = None):
        """
        Initialize encryption service
        """
        # Use environment variable or generate a master key
        self.master_key = master_key or os.getenv("CREDENTIAL_MASTER_KEY", "default_master_key_change_in_production")
        
    def generate_salt(self) -> str:
        """
        Generate a random salt for encryption
        """
        return secrets.token_hex(16)
    
    def derive_key(self, password: str, salt: str) -> bytes:
        """
        Derive encryption key from password and salt
        """
        # Combine master key with password for additional security
        combined_password = f"{self.master_key}:{password}".encode()
        salt_bytes = salt.encode()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt_bytes,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(combined_password))
    
    def encrypt_password(self, password: str, salt: Optional[str] = None) -> Tuple[str, str]:
        """
        Encrypt a password with optional salt
        
        Returns:
            Tuple of (encrypted_password, salt)
        """
        if salt is None:
            salt = self.generate_salt()
        
        # Derive encryption key
        key = self.derive_key(password, salt)
        fernet = Fernet(key)
        
        # Encrypt the password
        encrypted = fernet.encrypt(password.encode())
        encrypted_b64 = base64.b64encode(encrypted).decode()
        
        return encrypted_b64, salt
    
    def decrypt_password(self, encrypted_password: str, salt: str) -> str:
        """
        Decrypt a password using the salt
        
        Args:
            encrypted_password: Base64 encoded encrypted password
            salt: Salt used for encryption
            
        Returns:
            Decrypted password
            
        Raises:
            Exception: If decryption fails
        """
        try:
            # Derive the same key
            key = self.derive_key("", salt)  # We'll use the stored encrypted data
            fernet = Fernet(key)
            
            # Decrypt the password
            encrypted_bytes = base64.b64decode(encrypted_password.encode())
            decrypted = fernet.decrypt(encrypted_bytes)
            
            return decrypted.decode()
        except Exception as e:
            raise Exception(f"Failed to decrypt password: {str(e)}")
    
    def encrypt_credential(self, password: str) -> Tuple[str, str]:
        """
        Encrypt a credential with a new salt
        
        Returns:
            Tuple of (encrypted_password, salt)
        """
        salt = self.generate_salt()
        
        # Use a simpler encryption for this implementation
        # In production, use proper encryption library
        key = self.create_encryption_key(salt)
        encrypted = self.xor_encrypt(password, key)
        encrypted_b64 = base64.b64encode(encrypted.encode()).decode()
        
        return encrypted_b64, salt
    
    def decrypt_credential(self, encrypted_password: str, salt: str) -> str:
        """
        Decrypt a credential using the salt
        """
        try:
            # Decode from base64
            encrypted = base64.b64decode(encrypted_password.encode()).decode()
            
            # Use the same key derivation
            key = self.create_encryption_key(salt)
            decrypted = self.xor_decrypt(encrypted, key)
            
            return decrypted
        except Exception as e:
            raise Exception(f"Failed to decrypt credential: {str(e)}")
    
    def create_encryption_key(self, salt: str) -> str:
        """
        Create encryption key from master key and salt
        """
        combined = f"{self.master_key}:{salt}"
        hash_object = hashlib.sha256(combined.encode())
        return hash_object.hexdigest()
    
    def xor_encrypt(self, text: str, key: str) -> str:
        """
        Simple XOR encryption
        """
        result = ""
        for i in range(len(text)):
            result += chr(ord(text[i]) ^ ord(key[i % len(key)]))
        return result
    
    def xor_decrypt(self, encrypted: str, key: str) -> str:
        """
        Simple XOR decryption (same as encryption)
        """
        return self.xor_encrypt(encrypted, key)
    
    def hash_connection_identifier(self, host: str, port: int, database: str, username: str, db_type: str) -> str:
        """
        Create a hash for connection identification
        """
        connection_string = f"{host}:{port}/{database}@{username}:{db_type}"
        return hashlib.sha256(connection_string.encode()).hexdigest()
    
    def verify_encryption_integrity(self, encrypted_password: str, salt: str, original_password: str) -> bool:
        """
        Verify that encryption/decryption works correctly
        """
        try:
            decrypted = self.decrypt_credential(encrypted_password, salt)
            return decrypted == original_password
        except:
            return False


# Global encryption service instance
encryption_service = CredentialEncryption()


def get_encryption_service() -> CredentialEncryption:
    """
    Get the global encryption service instance
    """
    return encryption_service


# Utility functions
def encrypt_database_password(password: str) -> Tuple[str, str]:
    """
    Encrypt a database password
    
    Returns:
        Tuple of (encrypted_password, salt)
    """
    return encryption_service.encrypt_credential(password)


def decrypt_database_password(encrypted_password: str, salt: str) -> str:
    """
    Decrypt a database password
    """
    return encryption_service.decrypt_credential(encrypted_password, salt)


def generate_connection_hash(host: str, port: int, database: str, username: str, db_type: str) -> str:
    """
    Generate connection hash for duplicate detection
    """
    return encryption_service.hash_connection_identifier(host, port, database, username, db_type)
