"""
Database module for TCET Chatbot
Handles PostgreSQL connection pool and SQLAlchemy session management
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from src.config import settings
import logging

logger = logging.getLogger(__name__)

# Create engine with connection pooling
engine = create_engine(
    settings.database_url,
    echo=settings.sqlalchemy_echo,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# Dependency for FastAPI
def get_db():
    """Get database session for FastAPI dependency injection"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Test connection
def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            logger.info("✓ PostgreSQL connection successful")
            return True
    except Exception as e:
        logger.error(f"✗ PostgreSQL connection failed: {e}")
        return False


if __name__ == "__main__":
    # Quick test
    if test_connection():
        print("Database connection verified!")
    else:
        print("Database connection failed!")