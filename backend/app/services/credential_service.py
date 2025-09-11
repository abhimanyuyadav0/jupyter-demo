"""
Service for managing database credentials
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
import logging

from app.models.credentials import DatabaseCredential, CredentialAuditLog
from app.core.encryption import (
    encrypt_database_password, 
    decrypt_database_password, 
    generate_connection_hash
)

logger = logging.getLogger(__name__)


# In-memory flags for connected credentials (persists until server restarts)
CONNECTED_CONNECTION_HASHES: set = set()

def mark_credential_connected(connection_hash: str) -> None:
    try:
        if connection_hash:
            CONNECTED_CONNECTION_HASHES.add(connection_hash)
    except Exception:
        pass

def clear_credential_connected(connection_hash: str) -> None:
    try:
        CONNECTED_CONNECTION_HASHES.discard(connection_hash)
    except Exception:
        pass

def clear_all_connected_flags() -> None:
    try:
        CONNECTED_CONNECTION_HASHES.clear()
    except Exception:
        pass

def is_credential_connected(connection_hash: str) -> bool:
    try:
        return connection_hash in CONNECTED_CONNECTION_HASHES
    except Exception:
        return False

class CredentialService:
    """
    Service for managing database credentials
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def save_credential(
        self, 
        name: str,
        host: str, 
        port: int, 
        database: str, 
        username: str, 
        password: str,
        db_type: str,
        user_session: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Save database credentials with duplicate checking
        
        Returns:
            Dict with status and credential info
        """
        try:
            # Generate connection hash for duplicate detection
            connection_hash = generate_connection_hash(host, port, database, username, db_type)
            
            # Check for existing credential
            existing = self.db.query(DatabaseCredential).filter(
                DatabaseCredential.connection_hash == connection_hash
            ).first()
            
            if existing and existing.is_active:
                # Log duplicate attempt
                self._log_operation(
                    connection_hash=connection_hash,
                    operation="duplicate_check",
                    success=True,
                    user_session=user_session,
                    metadata={"action": "found_existing"}
                )
                
                # Update last used time
                existing.last_used = datetime.utcnow()
                self.db.commit()
                
                return {
                    "status": "exists",
                    "message": "Credentials already exist for this connection",
                    "credential": existing.to_dict(),
                    "duplicate": True
                }
            
            # Encrypt the password
            encrypted_password, salt = encrypt_database_password(password)
            
            if existing:
                # Update existing inactive credential
                existing.name = name
                existing.encrypted_password = encrypted_password
                existing.encryption_salt = salt
                existing.updated_at = datetime.utcnow()
                existing.last_used = datetime.utcnow()
                existing.is_active = True
                existing.user_session = user_session
                credential = existing
                operation = "update"
            else:
                # Create new credential
                credential = DatabaseCredential(
                    connection_hash=connection_hash,
                    name=name,
                    host=host,
                    port=port,
                    database=database,
                    username=username,
                    db_type=db_type,
                    encrypted_password=encrypted_password,
                    encryption_salt=salt,
                    user_session=user_session,
                    last_used=datetime.utcnow()
                )
                self.db.add(credential)
                operation = "create"
            
            self.db.commit()
            self.db.refresh(credential)
            
            # Log successful save
            self._log_operation(
                credential_id=credential.id,
                connection_hash=connection_hash,
                operation=operation,
                success=True,
                user_session=user_session,
                metadata={"name": name, "db_type": db_type}
            )
            
            logger.info(f"✅ Credential saved: {name} ({db_type})")
            
            return {
                "status": "success",
                "message": "Credentials saved successfully",
                "credential": credential.to_dict(),
                "duplicate": False
            }
            
        except Exception as e:
            self.db.rollback()
            
            # Log error
            self._log_operation(
                connection_hash=connection_hash if 'connection_hash' in locals() else None,
                operation="save",
                success=False,
                error_message=str(e),
                user_session=user_session
            )
            
            logger.error(f"❌ Failed to save credential: {e}")
            
            return {
                "status": "error",
                "message": f"Failed to save credentials: {str(e)}",
                "credential": None,
                "duplicate": False
            }
    
    def get_credential(self, credential_id: int, user_session: Optional[str] = None) -> Optional[DatabaseCredential]:
        """
        Get credential by ID
        """
        try:
            credential = self.db.query(DatabaseCredential).filter(
                and_(
                    DatabaseCredential.id == credential_id,
                    DatabaseCredential.is_active == True
                )
            ).first()
            
            if credential:
                # Update last used
                credential.last_used = datetime.utcnow()
                self.db.commit()
                
                # Log access
                self._log_operation(
                    credential_id=credential.id,
                    connection_hash=credential.connection_hash,
                    operation="access",
                    success=True,
                    user_session=user_session
                )
            
            return credential
            
        except Exception as e:
            logger.error(f"❌ Failed to get credential {credential_id}: {e}")
            return None
    
    def get_credential_password(self, credential_id: int, user_session: Optional[str] = None) -> Optional[str]:
        """
        Get decrypted password for a credential
        """
        try:
            credential = self.get_credential(credential_id, user_session)
            if not credential:
                return None
            
            # Decrypt password
            password = decrypt_database_password(
                credential.encrypted_password,
                credential.encryption_salt
            )
            
            logger.info(f"🔓 Password retrieved for credential {credential_id}")
            return password
            
        except Exception as e:
            # Log decryption error
            self._log_operation(
                credential_id=credential_id,
                connection_hash=credential.connection_hash if 'credential' in locals() else None,
                operation="decrypt",
                success=False,
                error_message=str(e),
                user_session=user_session
            )
            
            logger.error(f"❌ Failed to decrypt password for credential {credential_id}: {e}")
            return None
    
    def list_credentials(self, user_session: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all active credentials for a user session
        """
        try:
            # Use a fresh session to avoid transaction issues
            from app.core.database import SessionLocal
            fresh_db = SessionLocal()
            
            try:
                query = fresh_db.query(DatabaseCredential).filter(
                    DatabaseCredential.is_active == True
                )
                
                if user_session:
                    query = query.filter(
                        or_(
                            DatabaseCredential.user_session == user_session,
                            DatabaseCredential.user_session.is_(None)
                        )
                    )
                
                credentials = query.order_by(DatabaseCredential.last_used.desc()).all()
                
                return [cred.to_dict() for cred in credentials]
                
            finally:
                fresh_db.close()
            
        except Exception as e:
            logger.error(f"❌ Failed to list credentials: {e}")
            return []
    
    def get_connections_for_frontend(self, user_session: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get credentials formatted for frontend consumption
        """
        try:
            # Use a fresh session to avoid transaction issues
            from app.core.database import SessionLocal
            fresh_db = SessionLocal()
            
            try:
                query = fresh_db.query(DatabaseCredential).filter(
                    DatabaseCredential.is_active == True
                )
                
                if user_session:
                    query = query.filter(
                        or_(
                            DatabaseCredential.user_session == user_session,
                            DatabaseCredential.user_session.is_(None)
                        )
                    )
                
                credentials = query.order_by(DatabaseCredential.last_used.desc()).all()
                
                # Build connection configs and set status based on persistent connect flags
                results: List[Dict[str, Any]] = []
                for cred in credentials:
                    cfg = cred.to_connection_config()
                    try:
                        if is_credential_connected(cred.connection_hash):
                            cfg["status"] = "connected"
                    except Exception:
                        pass
                    results.append(cfg)
                
                return results
                
            finally:
                fresh_db.close()
            
        except Exception as e:
            logger.error(f"❌ Failed to get connections for frontend: {e}")
            return []
    
    def delete_credential(self, credential_id: int, user_session: Optional[str] = None) -> bool:
        """
        Soft delete a credential
        """
        try:
            credential = self.db.query(DatabaseCredential).filter(
                DatabaseCredential.id == credential_id
            ).first()
            
            if not credential:
                return False
            
            # Soft delete
            credential.is_active = False
            credential.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            # Log deletion
            self._log_operation(
                credential_id=credential.id,
                connection_hash=credential.connection_hash,
                operation="delete",
                success=True,
                user_session=user_session
            )
            
            logger.info(f"🗑️ Credential deleted: {credential.name}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Failed to delete credential {credential_id}: {e}")
            return False
    
    def check_duplicate(self, host: str, port: int, database: str, username: str, db_type: str) -> Optional[DatabaseCredential]:
        """
        Check if credentials already exist for this connection
        """
        connection_hash = generate_connection_hash(host, port, database, username, db_type)
        
        return self.db.query(DatabaseCredential).filter(
            and_(
                DatabaseCredential.connection_hash == connection_hash,
                DatabaseCredential.is_active == True
            )
        ).first()
    
    def get_connection_with_password(self, credential_id: int, user_session: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get connection configuration with decrypted password
        """
        try:
            credential = self.get_credential(credential_id, user_session)
            if not credential:
                return None
            
            # Decrypt password
            password = decrypt_database_password(
                credential.encrypted_password,
                credential.encryption_salt
            )
            
            connection_config = credential.to_connection_config()
            connection_config["config"]["password"] = password
            
            return connection_config
            
        except Exception as e:
            logger.error(f"❌ Failed to get connection with password: {e}")
            return None
    
    def _log_operation(
        self, 
        connection_hash: Optional[str] = None,
        credential_id: Optional[int] = None,
        operation: str = "unknown",
        success: bool = True,
        error_message: Optional[str] = None,
        user_session: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log credential operation for audit
        """
        try:
            import json
            
            audit_log = CredentialAuditLog(
                credential_id=credential_id,
                connection_hash=connection_hash,
                operation=operation,
                success=success,
                error_message=error_message,
                user_session=user_session,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata_json=json.dumps(metadata) if metadata else None
            )
            
            self.db.add(audit_log)
            self.db.commit()
            
        except Exception as e:
            # Don't fail the main operation if logging fails
            logger.warning(f"⚠️ Failed to log credential operation: {e}")
    
    def get_audit_logs(self, credential_id: Optional[int] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get audit logs for credential operations
        """
        try:
            query = self.db.query(CredentialAuditLog)
            
            if credential_id:
                query = query.filter(CredentialAuditLog.credential_id == credential_id)
            
            logs = query.order_by(CredentialAuditLog.timestamp.desc()).limit(limit).all()
            
            return [log.to_dict() for log in logs]
            
        except Exception as e:
            logger.error(f"❌ Failed to get audit logs: {e}")
            return []


def get_credential_service(db: Session) -> CredentialService:
    """
    Factory function to create credential service
    """
    return CredentialService(db)
