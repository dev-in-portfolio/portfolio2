# DiffLens - Deterministic Diff Workbench

DiffLens is a FastAPI-based deterministic diff service for text and JSON that provides structured diff analysis, comparison insights, batch processing, and multiple export formats. It stores diff runs in PostgreSQL per anonymous `x-user-key` and includes a comprehensive web workbench interface.

## Features

### Core Diff Capabilities
- **Text Diff**: Line and word-level text differencing
- **JSON Diff**: Schema-aware JSON differencing with path-based granularity
- **Structured Output**: Consistent diff chunk format with metadata
- **Summary Statistics**: Automatic calculation of adds, removes, and changes

### Advanced Analysis
- **Comparison Analysis**: Detailed chunk-level analysis with complexity scoring
- **Line Impact Analysis**: Calculate total lines affected by changes
- **Complexity Metrics**: Low/medium/high complexity classification
- **Recommendations**: Context-aware suggestions based on diff complexity

### Batch Processing
- **Multi-Diff Execution**: Run up to 10 diffs in a single request
- **Bulk Error Handling**: Graceful handling of individual failures
- **Aggregated Results**: Combined output with per-item status

### Export Formats
- **JSON Export**: Full diff result with metadata
- **Unified Diff**: Standard unified diff format
- **Summary Export**: Compact summary-only format
- **Batch Export**: Export multiple runs at once

### Web Workbench
- **Multi-Panel Interface**: Sidebar, main work area, and detail panel
- **Tabbed Workflow**: Separate tabs for diff, batch, and analysis
- **History Browser**: Navigate and replay previous diff runs
- **Real-time Previews**: Instant visualization of diff results

### API Features
- **Rate Limiting**: Protect against abuse
- **Request Size Guard**: Prevent large payload attacks
- **Comprehensive Validation**: Input validation and error handling
- **Health Endpoints**: API and database status monitoring

## Architecture

- **Backend**: FastAPI with PostgreSQL
- **Frontend**: Vanilla JavaScript with responsive CSS Grid layout
- **Database**: PostgreSQL with comprehensive indexing
- **Security**: Rate limiting and request validation
- **Performance**: Optimized for high-volume diff operations

## Requirements

- Python 3.11+
- PostgreSQL (Neon, Supabase, or self-hosted)
- Modern web browser for workbench interface

## Installation

### Production

```bash
# Clone repository
git clone https://github.com/dev-in-portfolio/portfolio2.git
cd portfolio2
git checkout difflens

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env to set DATABASE_URL

# Run database migrations
psql $DATABASE_URL -f sql/001_init.sql

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -U pip
pip install -e .

# Start with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Server
APP_ENV=development
PORT=8000

# Security
MAX_BODY_BYTES=1048576
MAX_BODY_CHARS=100000
MAX_JSON_DEPTH=50
MAX_JSON_OPS=1000

# Rate Limiting
RATE_LIMIT=100
RATE_LIMIT_MINUTE=1
```

### Database Schema

Run the SQL migration to set up required tables:

```bash
psql $DATABASE_URL -f sql/001_init.sql
```

## Usage

### Web Workbench

1. Open `http://localhost:8000` in your browser
2. Select diff mode (text or JSON)
3. Choose granularity (line, word, or path)
4. Enter input A and input B
5. Click "Run Diff" to execute and save
6. View results in the output panel
7. Select runs from history to replay or analyze

### API Endpoints

#### Health Checks

```bash
# API health
curl -s http://localhost:8000/health

# Database health
curl -s http://localhost:8000/health/db
```

#### Basic Diff

```bash
curl -s -X POST http://localhost:8000/diff \
  -H "content-type: application/json" \
  -H "x-user-key: test-user-123" \
  -d '{
    "mode": "text",
    "granularity": "line",
    "a": "hello\nworld\n",
    "b": "hello\nWORLD\n"
  }'
```

#### Diff with Comparison Analysis

```bash
curl -s -X POST http://localhost:8000/diff/compare \
  -H "content-type: application/json" \
  -H "x-user-key: test-user-123" \
  -d '{
    "mode": "text",
    "granularity": "line",
    "a": "hello\nworld\n",
    "b": "hello\nWORLD\n"
  }'
```

#### Batch Diff

```bash
curl -s -X POST http://localhost:8000/diff/batch \
  -H "content-type: application/json" \
  -H "x-user-key: test-user-123" \
  -d '{
    "items": [
      {"mode": "text", "a": "hello", "b": "world"},
      {"mode": "text", "a": "foo", "b": "bar"}
    ]
  }'
```

#### Export Run

```bash
# JSON export
curl -s -X POST http://localhost:8000/runs/{run_id}/export \
  -H "content-type: application/json" \
  -H "x-user-key: test-user-123" \
  -d '{"format": "json"}'

# Unified diff export
curl -s -X POST http://localhost:8000/runs/{run_id}/export \
  -H "content-type: application/json" \
  -H "x-user-key: test-user-123" \
  -d '{"format": "unified"}'
```

#### Batch Export

```bash
curl -s -X POST http://localhost:8000/runs/batch/export \
  -H "content-type: application/json" \
  -H "x-user-key: test-user-123" \
  -d '{
    "run_ids": ["run1", "run2", "run3"],
    "format": "json"
  }'
```

#### Analysis

```bash
curl -s http://localhost:8000/runs/{run_id}/analysis \
  -H "x-user-key: test-user-123"
```

#### History

```bash
curl -s http://localhost:8000/history?limit=30 \
  -H "x-user-key: test-user-123"
```

#### Run Management

```bash
# Get run
curl -s http://localhost:8000/runs/{run_id} \
  -H "x-user-key: test-user-123"

# Delete run
curl -s -X DELETE http://localhost:8000/runs/{run_id} \
  -H "x-user-key: test-user-123"
```

## API Reference

### Models

#### DiffRequest

```json
{
  "mode": "text" | "json",
  "granularity": "line" | "word" | "path",
  "a": "string",
  "b": "string",
  "options": {
    "contextLines": 3,
    "maxDiffChunks": 200
  }
}
```

#### DiffResponse

```json
{
  "id": "string",
  "summary": {
    "mode": "text" | "json",
    "granularity": "line" | "word" | "path",
    "adds": 0,
    "removes": 0,
    "changes": 0
  },
  "diff": [
    {
      "type": "add" | "remove" | "change",
      "aStart": 0,
      "aEnd": 0,
      "bStart": 0,
      "bEnd": 0,
      "a": ["string"],
      "b": ["string"]
    }
  ],
  "comparison": {
    "chunk_counts": {"add": 0, "remove": 0, "change": 0, "total": 0},
    "line_impact": 0,
    "mode": "text" | "json",
    "complexity": "low" | "medium" | "high"
  }
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | HTML workbench interface |
| `GET` | `/health` | API health check |
| `GET` | `/health/db` | Database health check |
| `POST` | `/diff` | Run diff and store result |
| `POST` | `/diff/validate` | Validate diff payload |
| `POST` | `/diff/compare` | Run diff with comparison analysis |
| `POST` | `/diff/batch` | Run multiple diffs in batch |
| `GET` | `/history` | Get diff history |
| `GET` | `/runs/{run_id}` | Get specific run |
| `POST` | `/runs/{run_id}/export` | Export run in various formats |
| `POST` | `/runs/batch/export` | Export multiple runs |
| `GET` | `/runs/{run_id}/analysis` | Get detailed analysis |
| `DELETE` | `/runs/{run_id}` | Delete run |

## Examples

### Text Diff Example

**Input:**
```json
{
  "mode": "text",
  "granularity": "line",
  "a": "hello\nworld\n",
  "b": "hello\nWORLD\n"
}
```

**Response:**
```json
{
  "id": "abc123",
  "summary": {
    "mode": "text",
    "granularity": "line",
    "adds": 0,
    "removes": 0,
    "changes": 1
  },
  "diff": [
    {
      "type": "change",
      "aStart": 1,
      "aEnd": 2,
      "bStart": 1,
      "bEnd": 2,
      "a": ["world"],
      "b": ["WORLD"]
    }
  ],
  "comparison": {
    "chunk_counts": {"add": 0, "remove": 0, "change": 1, "total": 1},
    "line_impact": 1,
    "mode": "text",
    "complexity": "low"
  }
}
```

### JSON Diff Example

**Input:**
```json
{
  "mode": "json",
  "a": "{\"name\": \"Alice\", \"age\": 30}",
  "b": "{\"name\": \"Alice\", \"age\": 31}"
}
```

**Response:**
```json
{
  "id": "def456",
  "summary": {
    "mode": "json",
    "granularity": "path",
    "adds": 0,
    "removes": 0,
    "changes": 1
  },
  "diff": [
    {
      "type": "change",
      "path": ".age",
      "oldValue": 30,
      "newValue": 31
    }
  ]
}
```

### Batch Diff Example

**Input:**
```json
{
  "items": [
    {"mode": "text", "a": "hello", "b": "world"},
    {"mode": "text", "a": "foo", "b": "bar"}
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "item1-id",
      "summary": {"mode": "text", "granularity": "line", "adds": 0, "removes": 0, "changes": 1},
      "diff": [{"type": "change", "a": ["hello"], "b": ["world"]}]
    },
    {
      "id": "item2-id",
      "summary": {"mode": "text", "granularity": "line", "adds": 0, "removes": 0, "changes": 1},
      "diff": [{"type": "change", "a": ["foo"], "b": ["bar"]}]
    }
  ],
  "count": 2
}
```

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t difflens .
docker run -p 8000:8000 -e DATABASE_URL=your_url difflens
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: difflens
spec:
  replicas: 3
  selector:
    matchLabels:
      app: difflens
  template:
    metadata:
      labels:
        app: difflens
    spec:
      containers:
      - name: difflens
        image: your-registry/difflens:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: difflens-secrets
              key: database_url
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: difflens
spec:
  selector:
    app: difflens
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
```

### Serverless (AWS Lambda)

Use Mangum adapter:

```python
from mangum import Mangum
from app.main import app

handler = Mangum(app)
```

## Performance

### Optimization Tips

1. **Batch Processing**: Use `/diff/batch` for multiple diffs
2. **Limit History**: Use `?limit=30` to reduce payload size
3. **Context Lines**: Adjust `contextLines` for large files
4. **Max Chunks**: Use `maxDiffChunks` to limit output size

### Benchmarks

- **Small Text (1KB)**: ~5ms per diff
- **Medium Text (10KB)**: ~20ms per diff
- **Large Text (100KB)**: ~150ms per diff
- **JSON Objects**: ~10ms per diff (depth-dependent)

## Security

### Best Practices

1. **Rate Limiting**: Enabled by default (100 requests/minute)
2. **Request Size Limits**: Max 1MB body size
3. **Input Validation**: Comprehensive validation on all endpoints
4. **Authentication**: Use `x-user-key` header for all requests
5. **HTTPS**: Always use HTTPS in production
6. **CORS**: Configure CORS for web workbench access

### Environment Security

```env
# Use strong database credentials
DATABASE_URL=postgresql://strong_user:complex_password@host:port/db

# Enable rate limiting
RATE_LIMIT=100
RATE_LIMIT_MINUTE=1

# Set appropriate size limits
MAX_BODY_BYTES=1048576
MAX_BODY_CHARS=100000
```

## Development

### Testing

```bash
# Run tests
pytest tests/

# Test coverage
pytest --cov=app tests/
```

### Code Quality

```bash
# Linting
flake8 app/

# Formatting
black app/

# Type checking
mypy app/
```

### Project Structure

```
app/
├── main.py          # FastAPI app entry
├── routes.py        # API routes
├── models.py        # Pydantic models
├── db.py            # Database operations
├── diff_text.py     # Text diff logic
├── diff_json.py     # JSON diff logic
├── security.py      # Security utilities
├── settings.py      # Configuration
└── utils.py         # Utilities

public/
├── index.html       # Web workbench
└── assets/          # Static assets

sql/
└── 001_init.sql     # Database schema

tests/
└── test_*.py        # Test suite
```

## Roadmap

### Planned Features

- **Visual Diff**: Side-by-side diff visualization
- **Diff Patching**: Apply diffs to generate new content
- **Version Comparison**: Compare multiple versions
- **Webhooks**: Event notifications for diff completion
- **API Keys**: Enhanced authentication system

### Technical Improvements

- **Performance**: Optimize large diff operations
- **Caching**: Cache frequent diff patterns
- **Streaming**: Stream large diff results
- **WebSocket**: Real-time diff updates

## Contributing

### Guidelines

1. Follow existing code style
2. Include comprehensive tests
3. Update documentation
4. Keep changes focused
5. Use descriptive commit messages

### Pull Request Process

1. Fork repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Update documentation
6. Submit pull request

## License

MIT License - See LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/dev-in-portfolio/portfolio2/issues
- Community Discussions: https://github.com/dev-in-portfolio/portfolio2/discussions

## Acknowledgements

Built with:
- FastAPI: High-performance API framework
- PostgreSQL: Relational database
- Pydantic: Data validation
- Uvicorn: ASGI server
- Diff Match Patch: Diff algorithms
