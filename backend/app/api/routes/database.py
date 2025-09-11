"""
Database connection and management API routes
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
from sqlalchemy.orm import Session

from app.core.database import get_db_manager, DatabaseManager, get_db
from app.models.credentials import DatabaseCredential
from app.core.encryption import generate_connection_hash
from datetime import datetime
from app.services.credential_service import get_credential_service
from app.services.credential_service import mark_credential_connected, clear_all_connected_flags

logger = logging.getLogger(__name__)

router = APIRouter()

class DatabaseConnectionRequest(BaseModel):
    """Database connection request model"""
    host: str = Field(..., description="Database host")
    port: int = Field(..., description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")
    db_type: str = Field(default="postgresql", description="Database type")
    save_credentials: bool = Field(default=False, description="Save credentials securely")
    connection_name: str = Field(default="", description="Name for saved connection")

class DatabaseConnectionResponse(BaseModel):
    """Database connection response model"""
    status: str
    message: str
    connection_info: Optional[Dict[str, Any]] = None
    credential_saved: bool = False
    credential_duplicate: bool = False
    credential_info: Optional[Dict[str, Any]] = None

@router.post("/connect", response_model=DatabaseConnectionResponse)
async def connect_database(
    connection_request: DatabaseConnectionRequest,
    request: Request,
    db_manager: DatabaseManager = Depends(get_db_manager),
    db: Session = Depends(get_db)
):
    """
    Test and establish database connection with optional credential saving
    """
    try:
        # In a real implementation, you would use the provided credentials
        # For now, we'll use the configured database connection
        connection_info = await db_manager.connect()
        
        # Initialize credential saving results
        credential_saved = False
        credential_duplicate = False
        credential_info = None
        
        # Save credentials if requested
        if connection_request.save_credentials:
            try:
                credential_service = get_credential_service(db)
                
                # Generate connection name if not provided
                connection_name = connection_request.connection_name
                if not connection_name:
                    connection_name = f"{connection_request.database}@{connection_request.host}:{connection_request.port}"
                
                # Get user session for tracking
                user_session = request.headers.get("X-User-Session")
                if not user_session:
                    user_agent = request.headers.get("User-Agent", "")
                    client_host = getattr(request.client, 'host', 'unknown')
                    user_session = f"{client_host}:{hash(user_agent) % 10000}"
                
                # Save credential
                save_result = credential_service.save_credential(
                    name=connection_name,
                    host=connection_request.host,
                    port=connection_request.port,
                    database=connection_request.database,
                    username=connection_request.username,
                    password=connection_request.password,
                    db_type=connection_request.db_type,
                    user_session=user_session
                )
                
                if save_result["status"] == "success":
                    credential_saved = True
                    credential_info = save_result["credential"]
                    logger.info(f"✅ Credentials saved for connection: {connection_name}")
                elif save_result["status"] == "exists":
                    credential_duplicate = True
                    credential_info = save_result["credential"]
                    logger.info(f"🔄 Duplicate credentials found for: {connection_name}")
                else:
                    logger.warning(f"⚠️ Failed to save credentials: {save_result['message']}")
                    
            except Exception as cred_error:
                # Don't fail the connection if credential saving fails
                logger.error(f"❌ Credential saving failed: {cred_error}")
        
        response_message = "Successfully connected to database"
        if credential_saved:
            response_message += " and saved credentials securely"
        elif credential_duplicate:
            response_message += " (credentials already exist)"
        
        # Update last_used for matching saved credential (if it exists),
        # and mark it as connected until an explicit disconnect
        try:
            connection_hash = generate_connection_hash(
                connection_request.host,
                connection_request.port,
                connection_request.database,
                connection_request.username,
                connection_request.db_type,
            )
            cred = db.query(DatabaseCredential).filter(
                DatabaseCredential.connection_hash == connection_hash
            ).first()
            if cred:
                cred.last_used = datetime.utcnow()
                db.commit()
            # Remember the connected credential in-memory
            mark_credential_connected(connection_hash)
        except Exception as _:
            # Non-fatal; proceed without blocking response
            pass

        return DatabaseConnectionResponse(
            status="success",
            message=response_message,
            connection_info=connection_info,
            credential_saved=credential_saved,
            credential_duplicate=credential_duplicate,
            credential_info=credential_info
        )
        
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )

@router.get("/status")
async def get_connection_status(
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Get current database connection status
    """
    return {
        "connected": db_manager.is_connected,
        "status": "connected" if db_manager.is_connected else "disconnected"
    }

@router.post("/disconnect")
async def disconnect_database(
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Disconnect from database
    """
    try:
        await db_manager.disconnect()
        # Clear all connected flags on disconnect (single active connection model)
        clear_all_connected_flags()
        return {
            "status": "success",
            "message": "Successfully disconnected from database"
        }
    except Exception as e:
        logger.error(f"Database disconnection failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Disconnection failed: {str(e)}"
        )

@router.get("/schema")
async def get_database_schema(
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Get database schema information
    """
    if not db_manager.is_connected:
        raise HTTPException(
            status_code=400,
            detail="Database not connected"
        )
    
    try:
        schema_info = await db_manager.get_table_info()
        
        # Group by table for better organization
        tables = {}
        for column in schema_info:
            table_name = f"{column['table_schema']}.{column['table_name']}"
            if table_name not in tables:
                tables[table_name] = {
                    "schema": column['table_schema'],
                    "name": column['table_name'],
                    "columns": []
                }
            
            tables[table_name]["columns"].append({
                "name": column['column_name'],
                "type": column['data_type'],
                "nullable": column['is_nullable'] == 'YES',
                "default": column['column_default']
            })
        
        return {
            "status": "success",
            "tables": list(tables.values())
        }
        
    except Exception as e:
        logger.error(f"Failed to get schema: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get database schema: {str(e)}"
        )

@router.get("/tables/{table_name}/stats")
async def get_table_statistics(
    table_name: str,
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Get statistics for a specific table
    """
    if not db_manager.is_connected:
        raise HTTPException(
            status_code=400,
            detail="Database not connected"
        )
    
    try:
        stats = await db_manager.get_table_stats(table_name)
        return {
            "status": "success",
            "table": table_name,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get table stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get table statistics: {str(e)}"
        )
