"""
Create sample data for Jupyter analytics demonstration
"""

import psycopg2
import random
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin123@localhost:5432/jupyter_db")

def create_sample_tables():
    """Create sample tables for analytics demonstration"""
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Create users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            user_type VARCHAR(20) DEFAULT 'regular'
        );
        """)
        
        # Create analytics_events table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS analytics_events (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            event_type VARCHAR(50) NOT NULL,
            event_data JSONB,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            session_id VARCHAR(100),
            ip_address VARCHAR(45)
        );
        """)
        
        # Create sales_data table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sales_data (
            id SERIAL PRIMARY KEY,
            product_name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            quantity INTEGER NOT NULL,
            sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            customer_id INTEGER,
            region VARCHAR(50)
        );
        """)
        
        conn.commit()
        print("✅ Sample tables created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

def populate_sample_data():
    """Populate tables with sample data"""
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Drop existing tables to start fresh
        cursor.execute("DROP TABLE IF EXISTS analytics_events CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS sales_data CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS users CASCADE;")
        
        # Recreate tables
        cursor.execute("""
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            user_type VARCHAR(20) DEFAULT 'regular'
        );
        """)
        
        cursor.execute("""
        CREATE TABLE analytics_events (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            event_type VARCHAR(50) NOT NULL,
            event_data JSONB,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            session_id VARCHAR(100),
            ip_address VARCHAR(45)
        );
        """)
        
        cursor.execute("""
        CREATE TABLE sales_data (
            id SERIAL PRIMARY KEY,
            product_name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            quantity INTEGER NOT NULL,
            sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            customer_id INTEGER,
            region VARCHAR(50)
        );
        """)
        
        conn.commit()
        
        # Generate sample users
        users_data = []
        for i in range(100):
            user_type = random.choice(['regular', 'premium', 'admin'])
            created_at = datetime.now() - timedelta(days=random.randint(1, 365))
            last_login = datetime.now() - timedelta(hours=random.randint(1, 720))
            
            users_data.append((
                f"user_{i+1}",
                f"user{i+1}@example.com",
                created_at,
                last_login,
                random.choice([True, True, True, False]),  # 75% active
                user_type
            ))
        
        cursor.executemany("""
            INSERT INTO users (username, email, created_at, last_login, is_active, user_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, users_data)
        
        # Generate sample analytics events
        events_data = []
        event_types = ['page_view', 'click', 'download', 'signup', 'purchase', 'login']
        
        for _ in range(1000):
            user_id = random.randint(1, 100)
            event_type = random.choice(event_types)
            timestamp = datetime.now() - timedelta(hours=random.randint(1, 168))  # Last week
            
            event_data = {
                'page': random.choice(['/home', '/products', '/about', '/contact']),
                'duration': random.randint(1, 300),
                'source': random.choice(['google', 'direct', 'social', 'email'])
            }
            
            events_data.append((
                user_id,
                event_type,
                json.dumps(event_data),
                timestamp,
                f"session_{random.randint(1, 50)}",
                f"192.168.1.{random.randint(1, 254)}"
            ))
        
        cursor.executemany("""
            INSERT INTO analytics_events (user_id, event_type, event_data, timestamp, session_id, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, events_data)
        
        # Generate sample sales data
        sales_data = []
        products = [
            ('Laptop Pro', 'Electronics'), ('Coffee Maker', 'Appliances'), ('Running Shoes', 'Sports'),
            ('Book Collection', 'Books'), ('Headphones', 'Electronics'), ('Yoga Mat', 'Sports'),
            ('Blender', 'Appliances'), ('Novel Series', 'Books'), ('Smartphone', 'Electronics'),
            ('Tennis Racket', 'Sports')
        ]
        
        regions = ['North', 'South', 'East', 'West', 'Central']
        
        for _ in range(500):
            product_name, category = random.choice(products)
            price = round(random.uniform(10.0, 1000.0), 2)
            quantity = random.randint(1, 5)
            sale_date = datetime.now() - timedelta(days=random.randint(1, 90))
            customer_id = random.randint(1, 100)
            region = random.choice(regions)
            
            sales_data.append((
                product_name,
                category,
                price,
                quantity,
                sale_date,
                customer_id,
                region
            ))
        
        cursor.executemany("""
            INSERT INTO sales_data (product_name, category, price, quantity, sale_date, customer_id, region)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, sales_data)
        
        conn.commit()
        print("✅ Sample data populated successfully!")
        
        # Print summary
        cursor.execute("SELECT COUNT(*) FROM users;")
        user_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM analytics_events;")
        event_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sales_data;")
        sales_count = cursor.fetchone()[0]
        
        print(f"📊 Data Summary:")
        print(f"   - Users: {user_count}")
        print(f"   - Analytics Events: {event_count}")
        print(f"   - Sales Records: {sales_count}")
        
    except Exception as e:
        print(f"❌ Error populating data: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("🚀 Creating sample data for Jupyter analytics...")
    create_sample_tables()
    populate_sample_data()
    print("🎉 Sample data setup complete!")
