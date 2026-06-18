"""
Test Redis Connection
Verifies Redis connectivity and caching operations
"""

import redis
import json
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_redis_connection():
    """Test Redis connection and operations"""
    print("\n" + "="*50)
    print("Redis Connection Test")
    print("="*50)
    
    try:
        # Connect to Redis
        r = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_keepalive=True,
        )
        
        # Test ping
        pong = r.ping()
        if pong:
            print(f"✓ Connected to Redis")
        else:
            print(f"✗ Redis ping failed")
            return False
        
        # Get info
        info = r.info()
        print(f"  Version: {info.get('redis_version', 'unknown')}")
        print(f"  Mode: {info.get('redis_mode', 'unknown')}")
        print(f"  Connected clients: {info.get('connected_clients', 0)}")
        
        # Test SET/GET
        test_key = "phase1_test_key"
        test_value = {"message": "Phase 1 Redis Test", "status": "working"}
        
        r.set(test_key, json.dumps(test_value), ex=300)
        print(f"✓ SET operation successful")
        
        retrieved = r.get(test_key)
        if retrieved:
            parsed = json.loads(retrieved)
            print(f"✓ GET operation successful: {parsed}")
        else:
            print(f"✗ GET operation failed")
            return False
        
        # Test DEL
        r.delete(test_key)
        verify = r.get(test_key)
        if verify is None:
            print(f"✓ DELETE operation successful")
        else:
            print(f"✗ DELETE operation failed")
            return False
        
        # Test TTL
        r.set("ttl_test", "value", ex=10)
        ttl = r.ttl("ttl_test")
        if ttl > 0:
            print(f"✓ TTL operation successful (TTL: {ttl}s)")
        else:
            print(f"✗ TTL operation failed")
            return False
        
        # Test INCR for counters
        counter_key = "phase1_counter"
        r.incr(counter_key)
        r.incr(counter_key)
        counter_value = r.get(counter_key)
        if int(counter_value) == 2:
            print(f"✓ INCR operation successful (counter: {counter_value})")
        else:
            print(f"✗ INCR operation failed")
            return False
        
        # Cleanup
        r.delete(counter_key)
        r.close()
        
        print("\n✅ All Redis tests passed!")
        return True
        
    except redis.ConnectionError as e:
        print(f"\n❌ Redis connection failed: {e}")
        print("   Make sure Redis is running: docker compose up -d redis")
        return False
    except Exception as e:
        print(f"\n❌ Redis test failed: {e}")
        return False


if __name__ == "__main__":
    success = test_redis_connection()
    sys.exit(0 if success else 1)