"""
SQL query execution API routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import re

from app.core.database import get_db_manager, DatabaseManager
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class QueryRequest(BaseModel):
    """SQL query request model"""
    query: str = Field(..., description="SQL query to execute")
    params: Optional[Dict[str, Any]] = Field(default=None, description="Query parameters")
    limit: Optional[int] = Field(default=1000, description="Result limit")

class QueryResponse(BaseModel):
    """SQL query response model"""
    success: bool
    query: str
    data: Optional[List[Dict[str, Any]]] = None
    row_count: Optional[int] = None
    columns: Optional[List[str]] = None
    execution_time: Optional[float] = None
    error: Optional[str] = None

class QueryHistoryItem(BaseModel):
    """Query history item model"""
    id: str
    query: str
    timestamp: datetime
    success: bool
    row_count: Optional[int] = None
    execution_time: Optional[float] = None
    error: Optional[str] = None

# In-memory query history (in production, use a database)
query_history: List[QueryHistoryItem] = []

def validate_query(query: str) -> bool:
    """
    Basic SQL query validation for security
    """
    query_lower = query.lower().strip()
    
    # Block dangerous operations
    dangerous_keywords = [
        'drop', 'delete', 'truncate', 'alter', 'create', 
        'insert', 'update', 'grant', 'revoke'
    ]
    
    # Allow only SELECT statements for safety
    if not query_lower.startswith('select'):
        return False
    
    # Check for dangerous keywords
    for keyword in dangerous_keywords:
        if f' {keyword} ' in f' {query_lower} ':
            return False
    
    return True

@router.post("/execute", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Execute SQL query and return results
    """
    # Database will auto-connect if needed
    
    # Validate query for security
    if not validate_query(request.query):
        error_msg = "Only SELECT queries are allowed for security reasons"
        
        # Add to history
        history_item = QueryHistoryItem(
            id=str(len(query_history) + 1),
            query=request.query,
            timestamp=datetime.now(),
            success=False,
            error=error_msg
        )
        query_history.append(history_item)
        
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    
    try:
        start_time = datetime.now()
        
        # Execute query
        result = await db_manager.execute_query(
            query=request.query,
            params=request.params
        )
        
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        # Limit results if specified
        if request.limit and result.get('data'):
            result['data'] = result['data'][:request.limit]
            result['row_count'] = len(result['data'])
        
        # Add to history
        history_item = QueryHistoryItem(
            id=str(len(query_history) + 1),
            query=request.query,
            timestamp=start_time,
            success=result['success'],
            row_count=result.get('row_count'),
            execution_time=execution_time,
            error=result.get('error')
        )
        query_history.append(history_item)
        
        # Keep only last 100 queries
        if len(query_history) > 100:
            query_history.pop(0)
        
        return QueryResponse(
            success=result['success'],
            query=request.query,
            data=result.get('data'),
            row_count=result.get('row_count'),
            columns=result.get('columns'),
            execution_time=execution_time,
            error=result.get('error')
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Query execution failed: {error_msg}")
        
        # Add to history
        history_item = QueryHistoryItem(
            id=str(len(query_history) + 1),
            query=request.query,
            timestamp=datetime.now(),
            success=False,
            error=error_msg
        )
        query_history.append(history_item)
        
        raise HTTPException(
            status_code=500,
            detail=f"Query execution failed: {error_msg}"
        )

@router.get("/history")
async def get_query_history(
    limit: int = 20,
    offset: int = 0
):
    """
    Get query execution history
    """
    total = len(query_history)
    start_idx = max(0, total - offset - limit)
    end_idx = total - offset
    
    history_slice = query_history[start_idx:end_idx] if end_idx > start_idx else []
    
    return {
        "status": "success",
        "history": list(reversed(history_slice)),  # Most recent first
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/samples")
async def get_sample_queries():
    """
    Get sample SQL queries for different use cases
    """
    samples = [
        {
            "name": "User Analytics",
            "description": "Analyze user activity and engagement",
            "query": """SELECT 
    user_id,
    COUNT(*) as total_sessions,
    AVG(session_duration) as avg_duration,
    SUM(page_views) as total_page_views,
    MAX(last_activity) as last_seen
FROM user_sessions 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_sessions DESC
LIMIT 20;""",
            "category": "Analytics"
        },
        {
            "name": "Sales Performance",
            "description": "Monthly sales trends and performance metrics",
            "query": """SELECT 
    DATE_TRUNC('month', order_date) as month,
    COUNT(*) as total_orders,
    SUM(total_amount) as revenue,
    AVG(total_amount) as avg_order_value,
    COUNT(DISTINCT customer_id) as unique_customers
FROM orders
WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY month
ORDER BY month DESC;""",
            "category": "Sales"
        },
        {
            "name": "Product Insights",
            "description": "Top performing products and categories",
            "query": """SELECT 
    p.name as product_name,
    p.category,
    SUM(oi.quantity) as units_sold,
    SUM(oi.total_price) as revenue,
    AVG(r.rating) as avg_rating,
    COUNT(DISTINCT o.customer_id) as unique_buyers
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
LEFT JOIN reviews r ON p.id = r.product_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY p.id, p.name, p.category
ORDER BY revenue DESC
LIMIT 15;""",
            "category": "Product"
        },
        {
            "name": "Customer Segmentation",
            "description": "Segment customers by purchase behavior",
            "query": """SELECT 
    CASE 
        WHEN total_spent >= 1000 THEN 'High Value'
        WHEN total_spent >= 500 THEN 'Medium Value'
        ELSE 'Low Value'
    END as customer_segment,
    COUNT(*) as customer_count,
    AVG(total_spent) as avg_spent,
    AVG(order_count) as avg_orders
FROM (
    SELECT 
        customer_id,
        SUM(total_amount) as total_spent,
        COUNT(*) as order_count
    FROM orders
    WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY customer_id
) customer_stats
GROUP BY customer_segment
ORDER BY avg_spent DESC;""",
            "category": "Customer"
        }
    ]
    
    return {
        "status": "success",
        "samples": samples
    }

@router.post("/validate")
async def validate_sql_query(
    request: QueryRequest
):
    """
    Validate SQL query without executing it
    """
    is_valid = validate_query(request.query)
    
    if not is_valid:
        return {
            "valid": False,
            "message": "Only SELECT queries are allowed for security reasons",
            "suggestions": [
                "Use SELECT statements only",
                "Avoid DELETE, UPDATE, DROP operations",
                "Use WHERE clauses to limit results"
            ]
        }
    
    # Basic syntax validation
    query_lower = request.query.lower().strip()
    
    suggestions = []
    if 'limit' not in query_lower:
        suggestions.append("Consider adding LIMIT clause to control result size")
    
    if 'where' not in query_lower and 'group by' not in query_lower:
        suggestions.append("Consider adding WHERE clause to filter results")
    
    return {
        "valid": True,
        "message": "Query appears to be valid",
        "suggestions": suggestions
    }
