"""
Database models for credential storage
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import hashlib
import json

Base = declarative_base()

class DatabaseCredential(Base):
    """
    Store encrypted database credentials
    """
    __tablename__ = "database_credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Connection identifier (hash of host+port+database+username)
    connection_hash = Column(String(64), unique=True, index=True, nullable=False)
    
    # Connection metadata
    name = Column(String(255), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    db_type = Column(String(50), nullable=False)  # postgresql, mysql, mongodb, sqlite
    
    # Encrypted credentials
    encrypted_password = Column(Text, nullable=False)
    encryption_salt = Column(String(32), nullable=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    # Optional user/session identification
    user_session = Column(String(255), nullable=True, index=True)
    
    # Connection status
    is_active = Column(Boolean, default=True)
    
    # Create indexes for performance
    __table_args__ = (
        Index('idx_connection_lookup', 'host', 'port', 'database', 'username'),
        Index('idx_user_credentials', 'user_session', 'is_active'),
    )
    
    @classmethod
    def generate_connection_hash(cls, host, port, database, username, db_type):
        """
        Generate a unique hash for connection identification
        """
        connection_string = f"{host}:{port}/{database}@{username}:{db_type}"
        return hashlib.sha256(connection_string.encode()).hexdigest()
    
    def to_dict(self):
        """
        Convert to dictionary (without sensitive data)
        """
        return {
            "id": self.id,
            "connection_hash": self.connection_hash,
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "username": self.username,
            "db_type": self.db_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "is_active": self.is_active,
            "has_credentials": bool(self.encrypted_password)
        }
    
    def to_connection_config(self):
        """
        Convert to connection configuration format
        """
        return {
            "id": str(self.id),
            "name": self.name,
            "config": {
                "host": self.host,
                "port": str(self.port),
                "database": self.database,
                "username": self.username,
                "password": ""  # Never expose password
            },
            "type": self.db_type,
            "status": "disconnected",
            "lastConnected": self.last_used.isoformat() if self.last_used else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "hasSecureCredentials": True
        }


class CredentialAuditLog(Base):
    """
    Audit log for credential operations
    """
    __tablename__ = "credential_audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Reference to credential
    credential_id = Column(Integer, nullable=True)
    connection_hash = Column(String(64), nullable=False, index=True)
    
    # Operation details
    operation = Column(String(50), nullable=False)  # create, update, delete, access
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Context
    user_session = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Metadata
    metadata_json = Column(Text, nullable=True)  # JSON string for additional data
    
    def to_dict(self):
        """
        Convert to dictionary
        """
        return {
            "id": self.id,
            "credential_id": self.credential_id,
            "connection_hash": self.connection_hash,
            "operation": self.operation,
            "success": self.success,
            "error_message": self.error_message,
            "user_session": self.user_session,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "metadata": json.loads(self.metadata_json) if self.metadata_json else None
        }
