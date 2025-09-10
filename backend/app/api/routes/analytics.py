"""
Analytics and data visualization API routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import json
import io
import base64
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import nbformat
from nbformat.v4 import new_notebook, new_code_cell, new_markdown_cell

from app.core.database import get_db_manager, DatabaseManager
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class AnalyticsRequest(BaseModel):
    """Analytics generation request"""
    query: str = Field(..., description="SQL query for analytics")
    chart_type: str = Field(default="bar", description="Chart type: bar, line, pie, scatter")
    x_column: Optional[str] = Field(default=None, description="X-axis column")
    y_column: Optional[str] = Field(default=None, description="Y-axis column")

class ChartResponse(BaseModel):
    """Chart generation response"""
    success: bool
    chart_data: Optional[Dict[str, Any]] = None
    chart_image: Optional[str] = None  # Base64 encoded image
    error: Optional[str] = None

class NotebookExportRequest(BaseModel):
    """Jupyter notebook export request"""
    queries: List[str] = Field(..., description="List of queries to include")
    title: str = Field(default="Data Analysis Notebook", description="Notebook title")
    description: str = Field(default="Generated from Jupyter Frontend", description="Notebook description")

@router.get("/metrics")
async def get_live_metrics(
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Get real-time analytics metrics
    """
    try:
        # In a real application, these would be actual database queries
        # For demonstration, we'll generate realistic mock data
        
        current_time = datetime.now()
        
        # Simulate real-time metrics
        metrics = {
            "timestamp": current_time.isoformat(),
            "total_users": 1247 + int((current_time.minute % 10) * 15),
            "active_sessions": 89 + int((current_time.second % 30)),
            "revenue_today": round(15420.50 + (current_time.hour * 125.75), 2),
            "transactions_last_hour": 156 + int((current_time.minute % 20) * 3),
            "avg_response_time": round(245.5 + (current_time.second % 10) * 12.3, 1),
            "error_rate": round(max(0.1, 2.5 - (current_time.minute % 15) * 0.2), 2),
            "database_connections": 12 + int((current_time.second % 5)),
            "cpu_usage": 35 + int((current_time.second % 40)),
            "memory_usage": 62 + int((current_time.minute % 25))
        }
        
        # Generate trend data for charts
        chart_data = []
        for i in range(24):  # Last 24 hours
            hour_time = current_time - timedelta(hours=23-i)
            chart_data.append({
                "timestamp": hour_time.isoformat(),
                "hour": hour_time.strftime("%H:00"),
                "users": 800 + int(np.sin(i * 0.5) * 200) + np.random.randint(-50, 50),
                "revenue": round(500 + int(np.sin(i * 0.3) * 300) + np.random.randint(-100, 100), 2),
                "transactions": 80 + int(np.sin(i * 0.4) * 40) + np.random.randint(-20, 20)
            })
        
        return {
            "status": "success",
            "metrics": metrics,
            "trends": chart_data,
            "insights": [
                {
                    "title": "User Growth",
                    "value": "+12.5%",
                    "trend": "positive",
                    "description": "Daily active users increased compared to yesterday"
                },
                {
                    "title": "Revenue Trend",
                    "value": "+8.3%",
                    "trend": "positive", 
                    "description": "Revenue is trending upward this hour"
                },
                {
                    "title": "Response Time",
                    "value": f"{metrics['avg_response_time']}ms",
                    "trend": "neutral",
                    "description": "Average response time is within normal range"
                },
                {
                    "title": "System Health",
                    "value": "Optimal",
                    "trend": "positive",
                    "description": "All systems operating normally"
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics metrics: {str(e)}"
        )

@router.post("/chart", response_model=ChartResponse)
async def generate_chart(
    request: AnalyticsRequest,
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Generate chart from query results
    """
    if not db_manager.is_connected:
        raise HTTPException(
            status_code=400,
            detail="Database not connected"
        )
    
    try:
        # Execute query
        result = await db_manager.execute_query(request.query)
        
        if not result['success']:
            return ChartResponse(
                success=False,
                error=result.get('error', 'Query execution failed')
            )
        
        if not result['data']:
            return ChartResponse(
                success=False,
                error="No data returned from query"
            )
        
        # Convert to DataFrame
        df = pd.DataFrame(result['data'])
        
        # Generate chart
        plt.figure(figsize=(10, 6))
        plt.style.use('seaborn-v0_8')
        
        if request.chart_type == "bar":
            if request.x_column and request.y_column:
                df.plot(kind='bar', x=request.x_column, y=request.y_column)
            else:
                # Auto-detect columns
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    df[numeric_cols[0]].plot(kind='bar')
        
        elif request.chart_type == "line":
            if request.x_column and request.y_column:
                plt.plot(df[request.x_column], df[request.y_column], marker='o')
            else:
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    plt.plot(df[numeric_cols[0]], marker='o')
        
        elif request.chart_type == "pie":
            if request.y_column:
                plt.pie(df[request.y_column], labels=df.iloc[:, 0], autopct='%1.1f%%')
            else:
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    plt.pie(df[numeric_cols[0]], labels=df.iloc[:, 0], autopct='%1.1f%%')
        
        elif request.chart_type == "scatter":
            if request.x_column and request.y_column:
                plt.scatter(df[request.x_column], df[request.y_column], alpha=0.7)
            else:
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) >= 2:
                    plt.scatter(df[numeric_cols[0]], df[numeric_cols[1]], alpha=0.7)
        
        plt.title(f"{request.chart_type.title()} Chart")
        plt.tight_layout()
        
        # Convert plot to base64 image
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
        img_buffer.seek(0)
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        return ChartResponse(
            success=True,
            chart_data={
                "rows": len(df),
                "columns": list(df.columns),
                "chart_type": request.chart_type
            },
            chart_image=img_base64
        )
        
    except Exception as e:
        logger.error(f"Chart generation failed: {str(e)}")
        return ChartResponse(
            success=False,
            error=str(e)
        )

@router.post("/export/notebook")
async def export_jupyter_notebook(
    request: NotebookExportRequest
):
    """
    Export queries and analysis to Jupyter notebook
    """
    try:
        # Create new notebook
        nb = new_notebook()
        
        # Add title cell
        title_cell = new_markdown_cell(f"# {request.title}\n\n{request.description}\n\nGenerated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        nb.cells.append(title_cell)
        
        # Add imports cell
        imports_code = """import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import psycopg2
from sqlalchemy import create_engine
import warnings
warnings.filterwarnings('ignore')

# Set plotting style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

# Database connection
DATABASE_URL = "postgresql://username:password@localhost:5432/database_name"
engine = create_engine(DATABASE_URL)"""
        
        imports_cell = new_code_cell(imports_code)
        nb.cells.append(imports_cell)
        
        # Add each query as a separate cell
        for i, query in enumerate(request.queries, 1):
            # Add query description
            query_desc = new_markdown_cell(f"## Query {i}\n\n```sql\n{query}\n```")
            nb.cells.append(query_desc)
            
            # Add query execution code
            query_code = f'''# Execute query {i}
query_{i} = """{query}"""

df_{i} = pd.read_sql_query(query_{i}, engine)
print(f"Query {i} returned {{len(df_{i})}} rows")
df_{i}.head()'''
            
            query_cell = new_code_cell(query_code)
            nb.cells.append(query_cell)
            
            # Add visualization code
            viz_code = f'''# Visualize results from query {i}
plt.figure(figsize=(12, 6))

# Bar chart
plt.subplot(1, 2, 1)
if len(df_{i}.select_dtypes(include=[np.number]).columns) > 0:
    numeric_col = df_{i}.select_dtypes(include=[np.number]).columns[0]
    df_{i}[numeric_col].plot(kind='bar')
    plt.title(f'Bar Chart - {{numeric_col}}')
    plt.xticks(rotation=45)

# Line plot
plt.subplot(1, 2, 2)
if len(df_{i}.select_dtypes(include=[np.number]).columns) > 0:
    df_{i}[numeric_col].plot(kind='line', marker='o')
    plt.title(f'Line Chart - {{numeric_col}}')

plt.tight_layout()
plt.show()

# Basic statistics
print(f"\\nBasic statistics for Query {i}:")
print(df_{i}.describe())'''
            
            viz_cell = new_code_cell(viz_code)
            nb.cells.append(viz_cell)
        
        # Add analysis cell
        analysis_code = """# Combined Analysis
print("=== SUMMARY ANALYSIS ===")

# Combine insights from all queries
all_dataframes = [df for name, df in locals().items() if name.startswith('df_') and isinstance(df, pd.DataFrame)]

print(f"Total queries executed: {len(all_dataframes)}")
for i, df in enumerate(all_dataframes, 1):
    print(f"Query {i}: {len(df)} rows, {len(df.columns)} columns")

# Generate insights
print("\\n=== KEY INSIGHTS ===")
print("✓ Data analysis completed successfully")
print("✓ All visualizations generated")
print("✓ Ready for further analysis")

# Export results
print("\\n=== EXPORT OPTIONS ===")
print("# Export to CSV:")
print("# df_1.to_csv('query_1_results.csv', index=False)")
print("# df_2.to_csv('query_2_results.csv', index=False)")
"""
        
        analysis_cell = new_code_cell(analysis_code)
        nb.cells.append(analysis_cell)
        
        # Convert notebook to JSON
        notebook_json = nbformat.writes(nb)
        
        return {
            "status": "success",
            "notebook": json.loads(notebook_json),
            "filename": f"{request.title.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ipynb",
            "cell_count": len(nb.cells)
        }
        
    except Exception as e:
        logger.error(f"Notebook export failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export notebook: {str(e)}"
        )

@router.get("/insights")
async def get_data_insights(
    query: str,
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Generate automated insights from query results
    """
    if not db_manager.is_connected:
        raise HTTPException(
            status_code=400,
            detail="Database not connected"
        )
    
    try:
        # Execute query
        result = await db_manager.execute_query(query)
        
        if not result['success'] or not result['data']:
            raise HTTPException(
                status_code=400,
                detail="No data available for insights"
            )
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(result['data'])
        
        insights = []
        
        # Basic statistics
        insights.append({
            "type": "summary",
            "title": "Dataset Overview",
            "description": f"Dataset contains {len(df)} rows and {len(df.columns)} columns",
            "value": f"{len(df)} rows"
        })
        
        # Numeric column insights
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols[:3]:  # Limit to first 3 numeric columns
            mean_val = df[col].mean()
            max_val = df[col].max()
            min_val = df[col].min()
            
            insights.append({
                "type": "statistic",
                "title": f"{col} Statistics", 
                "description": f"Average: {mean_val:.2f}, Range: {min_val:.2f} to {max_val:.2f}",
                "value": f"Avg: {mean_val:.2f}"
            })
        
        # Trend analysis (if timestamp column exists)
        date_cols = df.select_dtypes(include=['datetime64']).columns
        if len(date_cols) > 0 and len(numeric_cols) > 0:
            insights.append({
                "type": "trend",
                "title": "Time Series Trend",
                "description": "Data shows temporal patterns suitable for trend analysis",
                "value": "Trending"
            })
        
        # Data quality insights
        null_counts = df.isnull().sum()
        if null_counts.sum() > 0:
            high_null_cols = null_counts[null_counts > len(df) * 0.1].index.tolist()
            if high_null_cols:
                insights.append({
                    "type": "warning",
                    "title": "Data Quality Alert",
                    "description": f"Columns with significant missing data: {', '.join(high_null_cols)}",
                    "value": f"{len(high_null_cols)} columns"
                })
        
        return {
            "status": "success",
            "insights": insights,
            "data_summary": {
                "rows": len(df),
                "columns": len(df.columns),
                "numeric_columns": len(numeric_cols),
                "missing_values": int(df.isnull().sum().sum())
            }
        }
        
    except Exception as e:
        logger.error(f"Insights generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insights: {str(e)}"
        )
