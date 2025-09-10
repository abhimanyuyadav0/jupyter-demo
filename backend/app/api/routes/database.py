"""
Database connection and management API routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging

from app.core.database import get_db_manager, DatabaseManager

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

class DatabaseConnectionResponse(BaseModel):
    """Database connection response model"""
    status: str
    message: str
    connection_info: Optional[Dict[str, Any]] = None

@router.post("/connect", response_model=DatabaseConnectionResponse)
async def connect_database(
    connection_request: DatabaseConnectionRequest,
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Test and establish database connection
    """
    try:
        # In a real implementation, you would use the provided credentials
        # For now, we'll use the configured database connection
        connection_info = await db_manager.connect()
        
        return DatabaseConnectionResponse(
            status="success",
            message="Successfully connected to database",
            connection_info=connection_info
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
