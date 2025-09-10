"""
Create database tables for credential storage
Run this script to set up the credential storage tables
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin123@localhost:5432/jupyter_db")

def create_credential_tables():
    """
    Create the credential storage tables
    """
    engine = create_engine(DATABASE_URL)
    
    # SQL for creating the database_credentials table
    create_credentials_table = """
    CREATE TABLE IF NOT EXISTS database_credentials (
        id SERIAL PRIMARY KEY,
        connection_hash VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        database VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        db_type VARCHAR(50) NOT NULL,
        encrypted_password TEXT NOT NULL,
        encryption_salt VARCHAR(32) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE,
        last_used TIMESTAMP WITH TIME ZONE,
        user_session VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE
    );
    """
    
    # SQL for creating the credential_audit_log table
    create_audit_table = """
    CREATE TABLE IF NOT EXISTS credential_audit_log (
        id SERIAL PRIMARY KEY,
        credential_id INTEGER,
        connection_hash VARCHAR(64) NOT NULL,
        operation VARCHAR(50) NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        user_session VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata_json TEXT
    );
    """
    
    # SQL for creating indexes
    create_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_connection_hash ON database_credentials(connection_hash);",
        "CREATE INDEX IF NOT EXISTS idx_connection_lookup ON database_credentials(host, port, database, username);",
        "CREATE INDEX IF NOT EXISTS idx_user_credentials ON database_credentials(user_session, is_active);",
        "CREATE INDEX IF NOT EXISTS idx_audit_connection ON credential_audit_log(connection_hash);",
        "CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON credential_audit_log(timestamp);",
    ]
    
    try:
        with engine.begin() as connection:
            print("🔧 Creating database_credentials table...")
            connection.execute(text(create_credentials_table))
            
            print("🔧 Creating credential_audit_log table...")
            connection.execute(text(create_audit_table))
            
            # Ensure new columns exist (idempotent migration)
            print("🔧 Ensuring latest schema changes...")
            connection.execute(text("""
                ALTER TABLE credential_audit_log
                ADD COLUMN IF NOT EXISTS metadata_json TEXT;
            """))
            
            print("🔧 Creating indexes...")
            for index_sql in create_indexes:
                connection.execute(text(index_sql))
            
            print("✅ All credential storage tables created successfully!")
            
            # Insert sample data for testing
            print("📝 Adding sample data...")
            sample_data = """
            INSERT INTO database_credentials 
            (connection_hash, name, host, port, database, username, db_type, encrypted_password, encryption_salt, user_session, is_active)
            VALUES 
            ('sample_hash_123', 'Sample PostgreSQL', 'localhost', 5432, 'sample_db', 'postgres', 'postgresql', 'encrypted_password_here', 'sample_salt', 'sample_session', false)
            ON CONFLICT (connection_hash) DO NOTHING;
            """
            connection.execute(text(sample_data))
            
            print("✅ Sample data added!")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise

if __name__ == "__main__":
    print("🚀 Setting up credential storage tables...")
    create_credential_tables()
    print("🎉 Credential storage setup complete!")
