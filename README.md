# TCET AI Chatbot + Auto-Update System - Phase 1 Setup

**Status:** Phase 1 Environment Setup  
**Timeline:** 2-3 days  
**Last Updated:** 2024-01-15

---

## Project Overview

Complete RAG-based AI chatbot system for TCET with automated website updates. This repository contains the local development environment setup (Phase 1).

**Components:**
- PostgreSQL database (opportunities, student profiles, audit logs)
- Redis caching layer (query results, embeddings)
- Ollama LLM (local LLaMA2 7B inference)
- FastAPI web server (role-based API endpoints)
- Web scrapers (TCET, Unstop, Internshala)
- Static HTML generator (auto-website update)

---

## Phase 1: Environment Setup

### Prerequisites

**Hardware:**
- 8GB RAM minimum (16GB recommended)
- 2 CPU cores minimum
- 20GB disk space (for databases + models)
- GPU optional but recommended (NVIDIA with CUDA toolkit)

**Software:**
- Docker & Docker Compose
- Python 3.11+
- Git
- Ollama (optional, for GPU acceleration)

### Installation Steps

#### Step 1: Clone Repository and Navigate

```bash
cd ~
git clone <repo-url> tcet-chatbot-local  # Replace with actual repo URL
cd tcet-chatbot-local
```

#### Step 2: Start Docker Containers

**For PostgreSQL + Redis:**

```bash
docker compose up -d
```

**Verify:**
```bash
docker compose ps
```

Expected output:
```
CONTAINER ID   IMAGE              STATUS         PORTS
xxx            postgres:15-alpine Up 2 minutes   0.0.0.0:5432->5432/tcp
xxx            redis:7-alpine     Up 2 minutes   0.0.0.0:6379->6379/tcp
```

#### Step 3: Create Python Virtual Environment

```bash
# Linux / macOS
python3.11 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

**Verify:**
```bash
which python  # Linux/macOS
where python  # Windows
```

Should show path inside venv folder.

#### Step 4: Install Dependencies

```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

**Verify (should complete without errors):**
```bash
pip list | grep -E "fastapi|sqlalchemy|redis|ollama"
```

#### Step 5: Test Connections

**Test PostgreSQL:**
```bash
cd tests
python test_postgres.py
```

**Expected output:**
```
==================================================
PostgreSQL Connection Test
==================================================
✓ Connected to PostgreSQL
  Version: PostgreSQL 15.x
  Database: tcet_chatbot
  User: postgres
✓ Write permission verified
✓ Read permission verified (test records: 1)
✓ Cleanup successful

✅ All PostgreSQL tests passed!
```

**Test Redis:**
```bash
python test_redis.py
```

**Expected output:**
```
==================================================
Redis Connection Test
==================================================
✓ Connected to Redis
  Version: 7.x
  Mode: standalone
  Connected clients: 1
✓ SET operation successful
✓ GET operation successful: {'message': 'Phase 1 Redis Test', 'status': 'working'}
✓ DELETE operation successful
✓ TTL operation successful (TTL: 9s)
✓ INCR operation successful (counter: 2)

✅ All Redis tests passed!
```

**Test Ollama (if GPU available):**
```bash
python test_ollama.py
```

**Expected output (if Ollama installed):**
```
==================================================
GPU Check
==================================================
✓ NVIDIA GPU detected:
  0, NVIDIA GeForce RTX 3060, 12GB

==================================================
Ollama Connection Test
==================================================
✓ Connected to Ollama API
✓ Available models:
  - llama2:latest (4.1GB)

✅ Ollama is ready to use!
```

---

## Project Structure

```
tcet-chatbot-local/
├── src/                          # Main source code
│   ├── __init__.py
│   ├── config.py                 # Environment configuration
│   ├── database.py               # SQLAlchemy setup + connection pool
│   ├── scrapers/                 # Web scrapers (Phase 2)
│   │   ├── tcet_scraper.py
│   │   ├── unstop_scraper.py
│   │   └── internshala_scraper.py
│   ├── models/                   # SQLAlchemy models + Pydantic schemas (Phase 2)
│   │   └── opportunity.py
│   ├── utils/                    # Utility functions
│   │   ├── dedup.py              # Deduplication logic (Phase 2)
│   │   └── validation.py         # Data validation (Phase 2)
│   └── api/                      # FastAPI endpoints (Phase 4)
│       ├── main.py
│       └── endpoints/
│
├── tests/                        # Test scripts
│   ├── test_postgres.py          # ✓ Created
│   ├── test_redis.py             # ✓ Created
│   ├── test_ollama.py            # ✓ Created
│   └── test_scrapers.py          # Phase 2
│
├── logs/                         # Log files (auto-created)
├── docker-compose.yml            # Database containers
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment template
├── .env                          # Local environment (gitignored)
├── .gitignore
└── README.md                     # This file
```

---

## Configuration

### Environment Variables (.env)

All settings are in `.env` file. Key variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:tcet_dev_123@localhost:5432/tcet_chatbot

# Redis
REDIS_URL=redis://localhost:6379/0

# Ollama (if GPU available)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# API
API_PORT=8000
API_HOST=0.0.0.0

# Debug
DEBUG=True
ENVIRONMENT=development
```

To change settings:
1. Edit `.env` file
2. Restart Python application (settings reloaded on startup)

---

## Common Commands

### Start Services

```bash
# Start Docker containers (PostgreSQL + Redis)
docker compose up -d

# Activate Python virtual environment
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Run test
python tests/test_postgres.py
python tests/test_redis.py
```

### Stop Services

```bash
# Stop Docker containers (data persisted)
docker compose down

# Keep data for next startup
docker compose down -v  # WARNING: Delete all data
```

### View Logs

```bash
# Docker logs
docker compose logs postgres
docker compose logs redis

# Application logs
tail -f logs/phase1_setup.log
```

### Check Database Directly

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d tcet_chatbot

# Query tables
\dt                                    # List tables
SELECT * FROM raw_opportunities;       # Sample query
\q                                     # Quit
```

### Check Redis Directly

```bash
# Connect to Redis
docker compose exec redis redis-cli

# Redis commands
PING
GET phase1_test_key
KEYS *
```

---

## Troubleshooting

### Docker Issues

**Problem:** `docker compose: command not found`
- **Solution:** Install Docker Desktop or docker-compose separately

**Problem:** Port 5432 already in use
- **Solution:** Edit docker-compose.yml, change port to `5433:5432`

**Problem:** Docker containers won't start
- **Solution:** 
  ```bash
  docker compose logs postgres
  docker compose logs redis
  ```

### Python Issues

**Problem:** `ModuleNotFoundError: No module named 'sqlalchemy'`
- **Solution:** 
  ```bash
  pip install -r requirements.txt
  ```

**Problem:** Virtual environment not activating
- **Solution:** Ensure you're in project directory
  ```bash
  cd ~/tcet-chatbot-local
  source venv/bin/activate
  ```

### Database Issues

**Problem:** PostgreSQL won't connect
- **Solution:** 
  ```bash
  # Wait 30 seconds for container to start
  sleep 30
  docker compose logs postgres
  ```

**Problem:** "password authentication failed"
- **Solution:** Check DATABASE_URL in .env matches docker-compose.yml

### Ollama Issues

**Problem:** `curl: (7) Failed to connect to localhost port 11434`
- **Solution:** Ollama not running
  ```bash
  ollama serve  # Start Ollama in new terminal
  ```

**Problem:** "No models found"
- **Solution:** Download a model
  ```bash
  ollama pull llama2
  ```

---

## Next Steps (Phase 2)

Once Phase 1 is complete:

1. **Database Schema** - Create SQLAlchemy models for:
   - raw_opportunities
   - student_profiles
   - applications
   - audit_logs

2. **Scrapers** - Implement:
   - TCET website scraper
   - Unstop integration
   - Internshala integration

3. **Data Pipeline** - Build:
   - Deduplication logic
   - Validation & quality checks
   - Confidence scoring
   - Batch embedding

---

## Documentation for Overleaf

This Phase 1 setup is documented for LaTeX in Overleaf:

**Section 1.1: Environment Setup**
- Installation steps (OS-specific)
- Docker configuration
- Virtual environment creation

**Section 1.2: Dependencies**
- Full requirements.txt with versions
- Rationale for each package

**Section 1.3: Configuration**
- .env file structure
- Database connection parameters
- Redis configuration

**Section 1.4: Verification**
- Test scripts and expected outputs
- Troubleshooting guide

**Section 1.5: Architecture Diagram**
- Docker container diagram
- Network topology
- Database schema overview

---

## Support

For issues or questions:
1. Check Troubleshooting section above
2. Review Phase 1 implementation tracker (PHASE_1_TRACKER.md)
3. Check Docker logs: `docker compose logs`
4. Check Python logs: `logs/phase1_setup.log`

---

**Phase 1 Complete When:**
- ✓ PostgreSQL running and tested
- ✓ Redis running and tested
- ✓ Python environment set up
- ✓ All dependencies installed
- ✓ Ollama (optional) connected
- ✓ Test scripts pass

**Estimated Time:** 2-3 hours