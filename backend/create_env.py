#!/usr/bin/env python3
"""
Create .env file with database configuration
"""

env_content = """# Database Configuration
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/jupyter_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jupyter_db
DB_USER=postgres
DB_PASSWORD=admin123

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

# CORS
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:3006"]

# Environment
ENVIRONMENT=development
DEBUG=true

# Jupyter Configuration
JUPYTER_EXPORT_PATH=./exports
MAX_QUERY_ROWS=10000
QUERY_TIMEOUT_SECONDS=30
"""

with open('.env', 'w') as f:
    f.write(env_content)

print("✅ .env file created successfully!")
print("📁 Database configured for: postgresql://postgres:admin123@localhost:5432/jupyter_db")
print("🚀 You can now run: python run.py")
