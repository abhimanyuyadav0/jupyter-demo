"""
API routes for credential management
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator
import logging

from app.core.database import get_db
from app.services.credential_service import get_credential_service
from app.core.encryption import generate_connection_hash

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class CredentialCreate(BaseModel):
    name: str
    host: str
    port: int
    database: str
    username: str
    password: str
    db_type: str
    save_credentials: bool = False
    
    @validator('port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v
    
    @validator('db_type')
    def validate_db_type(cls, v):
        allowed_types = ['postgresql', 'mysql', 'mongodb', 'sqlite']
        if v not in allowed_types:
            raise ValueError(f'Database type must be one of: {allowed_types}')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Connection name is required')
        return v.strip()


class CredentialResponse(BaseModel):
    id: int
    connection_hash: str
    name: str
    host: str
    port: int
    database: str
    username: str
    db_type: str
    created_at: Optional[str]
    updated_at: Optional[str]
    last_used: Optional[str]
    is_active: bool
    has_credentials: bool


class ConnectionConfig(BaseModel):
    id: str
    name: str
    config: Dict[str, Any]
    type: str
    status: str
    lastConnected: Optional[str]
    createdAt: Optional[str]
    hasSecureCredentials: bool


class CredentialSaveResponse(BaseModel):
    status: str
    message: str
    credential: Optional[CredentialResponse]
    duplicate: bool


def get_user_session(request: Request) -> Optional[str]:
    """
    Extract user session from request headers or generate one
    """
    # Try to get session from header
    session = request.headers.get("X-User-Session")
    if not session:
        # Generate a simple session based on client info
        user_agent = request.headers.get("User-Agent", "")
        client_host = getattr(request.client, 'host', 'unknown')
        session = f"{client_host}:{hash(user_agent) % 10000}"
    
    return session


@router.post("/save", response_model=CredentialSaveResponse)
async def save_credential(
    credential_data: CredentialCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Save database credentials with duplicate checking
    """
    try:
        # Only save if explicitly requested
        if not credential_data.save_credentials:
            return CredentialSaveResponse(
                status="skipped",
                message="Credential saving not requested",
                credential=None,
                duplicate=False
            )
        
        credential_service = get_credential_service(db)
        user_session = get_user_session(request)
        
        # Get client info for audit
        client_host = getattr(request.client, 'host', None)
        user_agent = request.headers.get("User-Agent")
        
        logger.info(f"💾 Saving credentials for: {credential_data.name}")
        
        result = credential_service.save_credential(
            name=credential_data.name,
            host=credential_data.host,
            port=credential_data.port,
            database=credential_data.database,
            username=credential_data.username,
            password=credential_data.password,
            db_type=credential_data.db_type,
            user_session=user_session
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        # Convert credential to response model if available
        credential_response = None
        if result["credential"]:
            cred = result["credential"]
            credential_response = CredentialResponse(**cred)
        
        return CredentialSaveResponse(
            status=result["status"],
            message=result["message"],
            credential=credential_response,
            duplicate=result["duplicate"]
        )
        
    except Exception as e:
        logger.error(f"❌ Error saving credential: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save credential: {str(e)}")


@router.get("/list", response_model=List[CredentialResponse])
async def list_credentials(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    List all saved credentials
    """
    try:
        credential_service = get_credential_service(db)
        user_session = get_user_session(request)
        
        credentials = credential_service.list_credentials(user_session)
        
        return [CredentialResponse(**cred) for cred in credentials]
        
    except Exception as e:
        logger.error(f"❌ Error listing credentials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list credentials: {str(e)}")


@router.get("/connections", response_model=List[ConnectionConfig])
async def get_connections(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get connections formatted for frontend
    """
    try:
        credential_service = get_credential_service(db)
        
        # Always get all connections (no user session filtering)
        connections = credential_service.get_connections_for_frontend(None)
        
        return [ConnectionConfig(**conn) for conn in connections]
        
    except Exception as e:
        logger.error(f"❌ Error getting connections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get connections: {str(e)}")


@router.get("/{credential_id}/password")
async def get_credential_password(
    credential_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get decrypted password for a credential
    """
    try:
        credential_service = get_credential_service(db)
        user_session = get_user_session(request)
        
        password = credential_service.get_credential_password(credential_id, user_session)
        
        if password is None:
            raise HTTPException(status_code=404, detail="Credential not found or decryption failed")
        
        return {"password": password}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting credential password: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get password: {str(e)}")


@router.get("/{credential_id}/connection")
async def get_connection_with_password(
    credential_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get connection configuration with decrypted password
    """
    try:
        credential_service = get_credential_service(db)
        user_session = get_user_session(request)
        
        connection = credential_service.get_connection_with_password(credential_id, user_session)
        
        if connection is None:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        return connection
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting connection with password: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get connection: {str(e)}")


@router.delete("/{credential_id}")
async def delete_credential(
    credential_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Delete a saved credential
    """
    try:
        credential_service = get_credential_service(db)
        user_session = get_user_session(request)
        
        success = credential_service.delete_credential(credential_id, user_session)
        
        if not success:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        return {"message": "Credential deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting credential: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete credential: {str(e)}")


@router.post("/check-duplicate")
async def check_duplicate(
    credential_data: CredentialCreate,
    db: Session = Depends(get_db)
):
    """
    Check if credentials already exist for this connection
    """
    try:
        credential_service = get_credential_service(db)
        
        existing = credential_service.check_duplicate(
            host=credential_data.host,
            port=credential_data.port,
            database=credential_data.database,
            username=credential_data.username,
            db_type=credential_data.db_type
        )
        
        if existing:
            return {
                "duplicate": True,
                "existing_credential": existing.to_dict(),
                "message": f"Credentials already exist for this connection: {existing.name}"
            }
        else:
            return {
                "duplicate": False,
                "existing_credential": None,
                "message": "No duplicate credentials found"
            }
        
    except Exception as e:
        logger.error(f"❌ Error checking duplicate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check duplicate: {str(e)}")


@router.get("/{credential_id}/audit")
async def get_credential_audit(
    credential_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get audit log for a credential
    """
    try:
        credential_service = get_credential_service(db)
        
        logs = credential_service.get_audit_logs(credential_id, limit)
        
        return {"audit_logs": logs}
        
    except Exception as e:
        logger.error(f"❌ Error getting audit logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get audit logs: {str(e)}")


@router.get("/audit/all")
async def get_all_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all audit logs
    """
    try:
        credential_service = get_credential_service(db)
        
        logs = credential_service.get_audit_logs(None, limit)
        
        return {"audit_logs": logs}
        
    except Exception as e:
        logger.error(f"❌ Error getting all audit logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get audit logs: {str(e)}")
