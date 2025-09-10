# Jupyter Frontend - FastAPI Backend

A high-performance FastAPI backend that provides real-time database connectivity, query execution, and analytics for the Jupyter Frontend React application.

## 🚀 Features

- **PostgreSQL Integration** - Secure database connections with connection pooling
- **Real-time Analytics** - Live metrics and data streaming via WebSockets
- **Query Execution** - Safe SQL query execution with validation
- **Data Visualization** - Automated chart generation from query results
- **Jupyter Export** - Export queries and analysis to Jupyter notebooks
- **RESTful API** - Comprehensive REST API with automatic documentation

## 📋 Prerequisites

- Python 3.8 or higher
- PostgreSQL database
- pip or pipenv for package management

## 🛠️ Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate     # Windows
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/your_database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database
   DB_USER=username
   DB_PASSWORD=password
   ```

## 🗄️ Database Setup

### Option 1: Existing PostgreSQL Database
If you have an existing PostgreSQL database, just update the `.env` file with your credentials.

### Option 2: Create New Database
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE jupyter_analytics;
CREATE USER jupyter_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jupyter_analytics TO jupyter_user;

-- Switch to the new database
\c jupyter_analytics

-- Create sample tables for demonstration
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10,2),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email, last_login) VALUES
('john_doe', 'john@example.com', NOW() - INTERVAL '2 hours'),
('jane_smith', 'jane@example.com', NOW() - INTERVAL '1 day'),
('bob_wilson', 'bob@example.com', NOW() - INTERVAL '3 hours');

INSERT INTO products (name, category, price) VALUES
('Laptop Pro', 'Electronics', 1299.99),
('Wireless Mouse', 'Accessories', 29.99),
('Mechanical Keyboard', 'Accessories', 89.99),
('4K Monitor', 'Electronics', 399.99);

INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 1329.98, 'completed'),
(2, 29.99, 'completed'),
(1, 489.98, 'pending'),
(3, 1299.99, 'completed');
```

## 🏃‍♂️ Running the Server

### Development Mode
```bash
# Using the run script
python run.py

# Or directly with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Production Mode
```bash
# Update environment
export ENVIRONMENT=production
export DEBUG=false

# Run with gunicorn (install separately)
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📚 API Endpoints

### Database Operations
- `POST /api/database/connect` - Connect to database
- `GET /api/database/status` - Check connection status
- `POST /api/database/disconnect` - Disconnect from database
- `GET /api/database/schema` - Get database schema
- `GET /api/database/tables/{table_name}/stats` - Get table statistics

### Query Operations
- `POST /api/query/execute` - Execute SQL query
- `GET /api/query/history` - Get query history
- `GET /api/query/samples` - Get sample queries
- `POST /api/query/validate` - Validate SQL query

### Analytics
- `GET /api/analytics/metrics` - Get real-time metrics
- `POST /api/analytics/chart` - Generate charts from data
- `POST /api/analytics/export/notebook` - Export to Jupyter notebook
- `GET /api/analytics/insights` - Get automated data insights

### WebSocket
- `WS /ws` - Real-time data streaming

### System
- `GET /health` - Health check
- `GET /docs` - API documentation (development only)

## 🔒 Security Features

- **Query Validation** - Only SELECT queries allowed for safety
- **SQL Injection Prevention** - Parameterized queries
- **CORS Protection** - Configurable allowed origins
- **Rate Limiting** - Built-in request throttling
- **Input Validation** - Pydantic model validation

## 🌐 WebSocket Usage

Connect to `ws://localhost:8000/ws` for real-time features:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

// Start real-time data streaming
ws.send(JSON.stringify({
    type: "start_stream"
}));

// Execute query via WebSocket
ws.send(JSON.stringify({
    type: "execute_query",
    query: "SELECT COUNT(*) FROM users"
}));

// Stop streaming
ws.send(JSON.stringify({
    type: "stop_stream"
}));
```

## 📊 Sample Queries

The API includes built-in sample queries for common analytics use cases:

```sql
-- User Analytics
SELECT user_id, COUNT(*) as order_count, SUM(total_amount) as total_spent
FROM orders 
GROUP BY user_id 
ORDER BY total_spent DESC;

-- Sales Performance
SELECT DATE_TRUNC('day', order_date) as day, 
       COUNT(*) as orders, 
       SUM(total_amount) as revenue
FROM orders 
GROUP BY day 
ORDER BY day DESC;

-- Product Performance
SELECT p.name, p.category, COUNT(o.id) as order_count
FROM products p
LEFT JOIN orders o ON p.id = o.user_id  -- This would be order_items in real schema
GROUP BY p.id, p.name, p.category;
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
psql -h localhost -p 5432 -U your_username -d your_database

# Check if PostgreSQL is running
sudo service postgresql status  # Linux
brew services list | grep postgresql  # Mac
```

### Common Errors

1. **"Database not connected"**
   - Verify database credentials in `.env`
   - Ensure PostgreSQL is running
   - Check firewall settings

2. **"ModuleNotFoundError"**
   - Activate virtual environment
   - Install requirements: `pip install -r requirements.txt`

3. **"Permission denied"**
   - Check database user permissions
   - Ensure user has SELECT privileges on tables

## 📈 Performance

- **Query Timeout**: 30 seconds (configurable)
- **Max Results**: 10,000 rows (configurable)
- **Connection Pooling**: Built-in SQLAlchemy pooling
- **Async Support**: Full async/await support for better performance

## 🔧 Configuration

All settings can be configured via environment variables or `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=localhost
DB_PORT=5432

# API
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# Security
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=["http://localhost:3000"]

# Limits
MAX_QUERY_ROWS=10000
QUERY_TIMEOUT_SECONDS=30
```

## 📖 Development

### Adding New Endpoints
1. Create new route in `app/api/routes/`
2. Add Pydantic models for request/response
3. Include router in `main.py`
4. Update documentation

### Testing
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/
```

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables for Production
```env
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-very-secure-secret-key
ALLOWED_ORIGINS=["https://yourdomain.com"]
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Check server logs for error details
4. Verify database connectivity and permissions

The backend is designed to work seamlessly with the React frontend and provides all necessary APIs for the Jupyter notebook demonstration features.
