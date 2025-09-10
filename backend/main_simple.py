"""
Simple FastAPI Backend for testing
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI application
app = FastAPI(
    title="Jupyter Frontend Backend API",
    description="Backend API for Jupyter notebook demonstration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3006"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "FastAPI backend is running!",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Jupyter Frontend Backend API",
        "version": "1.0.0",
        "health": "/health",
        "status": "running"
    }

# Simple database status endpoint (mock)
@app.get("/api/database/status")
async def get_connection_status():
    """Mock database status endpoint"""
    return {
        "connected": False,
        "status": "disconnected",
        "message": "Install database dependencies to enable real database connection"
    }

# Simple metrics endpoint (mock)
@app.get("/api/analytics/metrics")
async def get_live_metrics():
    """Mock analytics metrics endpoint"""
    return {
        "status": "success",
        "metrics": {
            "timestamp": "2024-01-01T00:00:00",
            "total_users": 1247,
            "active_sessions": 89,
            "revenue_today": 15420.50,
            "message": "Mock data - install full dependencies for real database connection"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
