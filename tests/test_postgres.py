"""
Test PostgreSQL Connection
Verifies database connectivity and basic operations
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.database import test_connection, engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_postgres_connection():
    """Test PostgreSQL connection details"""
    print("\n" + "="*50)
    print("PostgreSQL Connection Test")
    print("="*50)
    
    try:
        # Test basic connection
        with engine.connect() as conn:
            # Get version
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✓ Connected to PostgreSQL")
            print(f"  Version: {version}")
            
            # Get current database
            result = conn.execute(text("SELECT current_database()"))
            database = result.fetchone()[0]
            print(f"  Database: {database}")
            
            # Get current user
            result = conn.execute(text("SELECT current_user"))
            user = result.fetchone()[0]
            print(f"  User: {user}")
            
            # Test write permission
            conn.execute(text("CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, test_value VARCHAR(50))"))
            conn.execute(text("INSERT INTO test_table (test_value) VALUES ('Phase 1 Test')"))
            conn.commit()
            print(f"✓ Write permission verified")
            
            # Test read
            result = conn.execute(text("SELECT COUNT(*) FROM test_table"))
            count = result.fetchone()[0]
            print(f"✓ Read permission verified (test records: {count})")
            
            # Cleanup
            conn.execute(text("DROP TABLE test_table"))
            conn.commit()
            print(f"✓ Cleanup successful")
            
        print("\n✅ All PostgreSQL tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ PostgreSQL test failed: {e}")
        return False


if __name__ == "__main__":
    success = test_postgres_connection()
    sys.exit(0 if success else 1)