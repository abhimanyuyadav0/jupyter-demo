"""
Database configuration and connection management
"""

from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import asyncpg
import pandas as pd
from typing import Dict, Any, List, Optional
import logging
from .config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy setup
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=StaticPool,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
metadata = MetaData()

class DatabaseManager:
    """Database connection and query management"""
    
    def __init__(self):
        self.connection = None
        self.is_connected = False
    
    async def connect(self) -> Dict[str, Any]:
        """Test and establish database connection"""
        try:
            # Test connection with asyncpg for better async support
            self.connection = await asyncpg.connect(settings.DATABASE_URL)
            self.is_connected = True
            
            # Get database info
            version_result = await self.connection.fetchval("SELECT version()")
            
            logger.info("Successfully connected to PostgreSQL database")
            return {
                "status": "connected",
                "database_type": "PostgreSQL",
                "version": version_result,
                "host": settings.DB_HOST,
                "port": settings.DB_PORT,
                "database": settings.DB_NAME
            }
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            self.is_connected = False
            raise Exception(f"Connection failed: {str(e)}")
    
    async def disconnect(self):
        """Close database connection"""
        if self.connection:
            await self.connection.close()
            self.connection = None
            self.is_connected = False
            logger.info("Database connection closed")
    
    async def execute_query(self, query: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Execute SQL query and return results"""
        if not self.is_connected:
            # Auto-connect if not connected
            try:
                await self.connect()
            except Exception as e:
                raise Exception(f"Failed to connect to database: {str(e)}")
        
        try:
            # Clean and validate query
            clean_query = query.strip()
            if not clean_query:
                raise Exception("Empty query")
            
            # Execute query with timeout
            if params:
                rows = await self.connection.fetch(clean_query, *params.values())
            else:
                rows = await self.connection.fetch(clean_query)
            
            # Convert to list of dictionaries
            result_data = [dict(row) for row in rows]
            
            # Limit results to prevent memory issues
            if len(result_data) > settings.MAX_QUERY_ROWS:
                result_data = result_data[:settings.MAX_QUERY_ROWS]
                logger.warning(f"Query results truncated to {settings.MAX_QUERY_ROWS} rows")
            
            return {
                "success": True,
                "data": result_data,
                "row_count": len(result_data),
                "columns": list(result_data[0].keys()) if result_data else [],
                "query": clean_query
            }
            
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "query": query
            }
    
    async def get_table_info(self) -> List[Dict[str, Any]]:
        """Get database schema information"""
        if not self.is_connected:
            # Auto-connect if not connected
            try:
                await self.connect()
            except Exception as e:
                raise Exception(f"Failed to connect to database: {str(e)}")
        
        try:
            schema_query = """
            SELECT 
                table_schema,
                table_name,
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name, ordinal_position
            """
            
            rows = await self.connection.fetch(schema_query)
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"Failed to get table info: {str(e)}")
            raise Exception(f"Schema query failed: {str(e)}")
    
    async def get_table_stats(self, table_name: str) -> Dict[str, Any]:
        """Get basic statistics for a table"""
        if not self.is_connected:
            # Auto-connect if not connected
            try:
                await self.connect()
            except Exception as e:
                raise Exception(f"Failed to connect to database: {str(e)}")
        
        try:
            stats_query = f"""
            SELECT 
                COUNT(*) as row_count,
                pg_size_pretty(pg_total_relation_size('{table_name}')) as table_size
            FROM {table_name}
            """
            
            result = await self.connection.fetchrow(stats_query)
            return dict(result) if result else {}
            
        except Exception as e:
            logger.error(f"Failed to get table stats: {str(e)}")
            return {"error": str(e)}

# Global database manager instance
db_manager = DatabaseManager()

def get_db() -> Session:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_db_manager() -> DatabaseManager:
    """Dependency to get database manager"""
    return db_manager
