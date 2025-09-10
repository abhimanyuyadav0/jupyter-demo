#!/usr/bin/env python3
"""
FastAPI development server runner
"""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Configuration
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"
    
    print(f"🚀 Starting FastAPI server on {host}:{port}")
    print(f"📁 Reload mode: {reload}")
    print(f"📊 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"🔗 API Documentation: http://{host}:{port}/docs")
    print(f"❤️  Health Check: http://{host}:{port}/health")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )
