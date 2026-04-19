# NeonScope - Database Observatory

**Safe, read-only exploration of your Neon Postgres instance**

NeonScope is a Streamlit dashboard that provides a disciplined read-only data cockpit for exploring Neon Postgres databases. It includes schema browsing, query execution, saved queries, audit history, and health monitoring.

## Features

✅ **Schema Explorer** - Browse tables and explore database structure
✅ **Query Workbench** - Execute read-only SQL queries with syntax highlighting
✅ **Saved Queries** - Save and manage frequently used queries
✅ **Audit History** - Review past query executions and performance
✅ **Health Dashboard** - Monitor database health and run diagnostics
✅ **Query Templates** - Quick templates for common analysis tasks
✅ **Export Results** - Download query results as CSV or JSON
✅ **Read-Only Safety** - Only SELECT/CTE queries are allowed

## Local Setup

### Prerequisites
- Python 3.8+
- Node.js (for Netlify functions)
- PostgreSQL client libraries

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/neonscope.git
   cd neonscope
   ```

2. **Set up Python environment**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure database connection**
   - Copy `.streamlit/secrets.toml.example` to `.streamlit/secrets.toml`
   - Set your `DATABASE_URL` in the secrets file

4. **Start the Streamlit app**
   ```bash
   streamlit run app.py
   ```

5. **For Netlify deployment**
   - Install Netlify CLI: `npm install -g netlify-cli`
   - Deploy functions: `netlify deploy --prod`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEONSCOPE_DATABASE_URL` | Postgres connection URL | Required |
| `APP_PASSCODE` | Optional access passcode | None |
| `READ_ONLY` | Enforce read-only mode | `true` |
| `API_BASE` | API base URL | `/api/neonscope` |

### Database Schema

The application automatically creates these tables:
- `ns_saved_queries` - Stores saved query definitions
- `ns_query_audit` - Logs all query executions with performance metrics

## Usage

### Schema Explorer
- Browse all tables in your database
- Filter by schema
- Quick actions: Preview data, count rows, save queries
- Query templates for common analysis tasks

### Query Workbench
- Write and execute SQL queries
- Set row limits (10-200)
- Save queries for later use
- View query history
- Export results as CSV or JSON

### Saved Queries
- Manage your saved queries
- Run, edit, or delete queries
- Organize frequently used analyses

### Audit History
- Review past query executions
- See performance metrics
- Export audit logs

### Health Dashboard
- Check API and database connectivity
- Run diagnostic tests
- Monitor system health

## Query Templates

Built-in templates for common tasks:
- **Recent Rows**: `SELECT * FROM {table} ORDER BY id DESC LIMIT 100`
- **Row Count**: `SELECT COUNT(*) as total_rows FROM {table}`
- **Null Audit**: `SELECT COUNT(*) as null_count FROM {table} WHERE {column} IS NULL`
- **Index Check**: `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '{table}'`
- **Slow Table Scout**: `EXPLAIN ANALYZE SELECT * FROM {table} LIMIT 1`

## Safety Features

- **Read-Only Enforcement**: Only SELECT and CTE queries are allowed
- **Query Validation**: Blocks INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE
- **Row Limits**: Maximum 200 rows per query
- **Audit Logging**: All queries are logged with execution metrics
- **Error Handling**: Graceful error handling and user feedback

## Deployment

### Netlify
1. Set up Netlify site
2. Configure environment variables in Netlify settings
3. Deploy the `functions` directory
4. Configure Streamlit app to point to Netlify functions

### Docker
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["streamlit", "run", "app.py", "--server.port=8080", "--server.address=0.0.0.0"]
```

## Development

### Backend API
The backend API is in `src/server.js` and provides:
- `/api/health` - Health check
- `/api/health/db` - Database connectivity check
- `/api/neonscope/tables` - List all tables
- `/api/neonscope/query` - Execute read-only query
- `/api/neonscope/saved` - Manage saved queries
- `/api/neonscope/audit` - Get audit history

### Frontend
The Streamlit app in `app.py` provides the user interface with:
- Multi-page navigation
- Responsive design
- Query execution with results
- Data export capabilities
- Health monitoring

## Troubleshooting

### Common Issues

**API not available**:
- Check Netlify function deployment
- Verify environment variables
- Check Netlify function logs

**Database connection failed**:
- Verify DATABASE_URL format
- Check database firewall rules
- Test connection with psql

**Query execution errors**:
- Ensure queries are read-only (SELECT/CTE only)
- Check for syntax errors
- Verify table names exist

## License

MIT License - See LICENSE for details

## Support

For issues or questions, please open a GitHub issue.

---

**NeonScope** - Turning database complexity into clarity, one safe query at a time. 🔍
