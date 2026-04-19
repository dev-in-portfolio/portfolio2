# NeonScope - Streamlit Dashboard for Neon Postgres Exploration
# Safe, read-only database observatory with query history and schema browsing

import streamlit as st
import pandas as pd
import requests
import json
from datetime import datetime
import os
import time

# Configuration
DEFAULT_API_BASE = os.environ.get("NEONSCOPE_API_BASE", "http://127.0.0.1:3000/api/neonscope")
APP_TITLE = "NeonScope - Database Observatory"
APP_DESCRIPTION = "Safe read-only exploration of your Neon Postgres instance"

# Initialize session state
if "saved_queries" not in st.session_state:
    st.session_state.saved_queries = []
if "query_history" not in st.session_state:
    st.session_state.query_history = []
if "current_query" not in st.session_state:
    st.session_state.current_query = ""
if "current_query_name" not in st.session_state:
    st.session_state.current_query_name = ""
if "current_limit" not in st.session_state:
    st.session_state.current_limit = 50
if "show_advanced" not in st.session_state:
    st.session_state.show_advanced = False
if "api_base" not in st.session_state:
    st.session_state.api_base = DEFAULT_API_BASE
if "app_passcode" not in st.session_state:
    st.session_state.app_passcode = os.environ.get("APP_PASSCODE", "")
if "nav_page" not in st.session_state:
    st.session_state.nav_page = "Schema Explorer"


def get_api_base():
    api_base = str(st.session_state.api_base or "").strip()
    if api_base.startswith("/"):
        # Streamlit runs in Python, so API base must be absolute for requests.
        st.error(
            "API base must be an absolute URL (for example: http://127.0.0.1:3000/api/neonscope)."
        )
        return None
    return api_base.rstrip("/")


def get_api_headers():
    passcode = str(st.session_state.app_passcode or "").strip()
    if not passcode:
        return {}
    return {"X-Passcode": passcode}

# API Helper Functions
def api_get(endpoint):
    """Make GET request to NeonScope API"""
    api_base = get_api_base()
    if not api_base:
        return None
    try:
        response = requests.get(f"{api_base}{endpoint}", headers=get_api_headers(), timeout=20)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API Error: {e}")
        return None

def api_post(endpoint, data):
    """Make POST request to NeonScope API"""
    api_base = get_api_base()
    if not api_base:
        return None
    try:
        response = requests.post(
            f"{api_base}{endpoint}", json=data, headers=get_api_headers(), timeout=45
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API Error: {e}")
        return None

def api_delete(endpoint):
    """Make DELETE request to NeonScope API"""
    api_base = get_api_base()
    if not api_base:
        return None
    try:
        response = requests.delete(f"{api_base}{endpoint}", headers=get_api_headers(), timeout=20)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API Error: {e}")
        return None

# Query Templates
QUERY_TEMPLATES = {
    "Recent Rows": "SELECT * FROM {table} ORDER BY id DESC LIMIT 100",
    "Row Count": "SELECT COUNT(*) as total_rows FROM {table}",
    "Null Audit": "SELECT COUNT(*) as null_count FROM {table} WHERE {column} IS NULL",
    "Index Check": "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '{table}'",
    "Slow Table Scout": "EXPLAIN ANALYZE SELECT * FROM {table} LIMIT 1"
}

# Main App
def main():
    # Page Configuration
    st.set_page_config(
        page_title=APP_TITLE,
        page_icon="🔍",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Custom CSS
    st.markdown("""
    <style>
    .main-header {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        color: white;
        padding: 2rem;
        border-radius: 0.75rem;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #12122a;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #2d2d4a;
    }
    .query-editor {
        background-color: #0a0a1a;
        border: 1px solid #2d2d4a;
        border-radius: 0.5rem;
    }
    .result-table {
        background-color: #12122a;
        border-radius: 0.5rem;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown(f"""
    <div class="main-header">
        <h1>🔍 {APP_TITLE}</h1>
        <p>{APP_DESCRIPTION}</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.header("Navigation")
        page = st.radio(
            "Select View",
            ["Schema Explorer", "Query Workbench", "Saved Queries", "Audit History", "Health Dashboard"],
            key="nav_page",
        )
        
        st.divider()
        st.header("Quick Actions")
        if st.button("📊 Refresh Data"):
            st.rerun()
        
        if st.button("🔄 Clear Cache"):
            st.session_state.query_history = []
            st.success("Cache cleared!")
            st.rerun()
        
        st.divider()
        st.header("Settings")
        st.session_state.current_limit = st.slider("Result Limit", 10, 200, st.session_state.current_limit)
        st.session_state.show_advanced = st.checkbox("Show Advanced Options", st.session_state.show_advanced)

        if st.session_state.show_advanced:
            st.text_input("API Base URL", value=st.session_state.api_base, key="api_base_input")
            st.text_input(
                "API Passcode (optional)",
                value=st.session_state.app_passcode,
                key="passcode_input",
                type="password",
            )
            if st.button("Apply Settings"):
                st.session_state.api_base = str(st.session_state.api_base_input or "").strip()
                st.session_state.app_passcode = str(st.session_state.passcode_input or "").strip()
                st.success("Settings applied.")
                st.rerun()
    
    # Check API Health
    health = api_get("/health")
    if health and health.get("ok"):
        db_health = api_get("/health/db")
        if db_health and db_health.get("ok"):
            st.success("✅ Connected to database")
        else:
            st.warning("⚠️ Database connection issue")
    else:
        st.error("❌ API not available")
        return
    
    # Page Router
    if page == "Schema Explorer":
        show_schema_explorer()
    elif page == "Query Workbench":
        show_query_workbench()
    elif page == "Saved Queries":
        show_saved_queries()
    elif page == "Audit History":
        show_audit_history()
    elif page == "Health Dashboard":
        show_health_dashboard()

def show_schema_explorer():
    """Schema Explorer Page"""
    st.header("🗃️ Schema Explorer")
    st.write("Browse tables and explore database structure")
    
    # Load tables
    with st.spinner("Loading tables..."):
        tables_data = api_get("/tables")
    
    if not tables_data or not tables_data.get("tables"):
        st.warning("No tables found or unable to load schema")
        return
    
    tables = tables_data["tables"]
    
    # Schema Statistics
    schemas = set(table["table_schema"] for table in tables)
    table_count = len(tables)
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Tables", table_count)
    with col2:
        st.metric("Schemas", len(schemas))
    with col3:
        st.metric("Last Updated", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    st.divider()
    
    # Schema Filter
    selected_schema = st.selectbox(
        "Select Schema",
        options=["All Schemas"] + sorted(schemas)
    )
    
    # Filter tables by schema
    filtered_tables = (
        tables
        if selected_schema == "All Schemas"
        else [t for t in tables if t["table_schema"] == selected_schema]
    )
    
    # Table Browser
    st.subheader("Tables")
    
    for table in filtered_tables:
        with st.expander(f"📋 {table['table_schema']}.{table['table_name']}", expanded=False):
            col1, col2, col3 = st.columns([2, 1, 1])
            
            with col1:
                if st.button("🔍 Preview Data", key=f"preview_{table['table_name']}"):
                    preview_query = f"SELECT * FROM {table['table_schema']}.{table['table_name']} LIMIT 10"
                    st.session_state.current_query = preview_query
                    st.session_state.current_query_name = f"Preview: {table['table_name']}"
                    st.session_state.nav_page = "Query Workbench"
                    st.rerun()
            
            with col2:
                if st.button("📊 Count Rows", key=f"count_{table['table_name']}"):
                    count_query = f"SELECT COUNT(*) as total_rows FROM {table['table_schema']}.{table['table_name']}"
                    result = api_post("/query", {
                        "sql": count_query,
                        "name": f"Count: {table['table_name']}",
                        "limit": 100
                    })
                    
                    if result and result.get("rows"):
                        row_count = result["rows"][0]["total_rows"]
                        st.success(f"📊 {row_count:,} rows in {table['table_name']}")
            
            with col3:
                if st.button("💾 Save Query", key=f"save_{table['table_name']}"):
                    st.session_state.current_query = f"SELECT * FROM {table['table_schema']}.{table['table_name']} LIMIT 100"
                    st.session_state.current_query_name = f"Explore: {table['table_name']}"
                    st.session_state.nav_page = "Saved Queries"
                    st.rerun()
            
            # Quick Query Templates
            st.subheader("Quick Queries")
            template_cols = st.columns(2)
            
            for i, (template_name, template_sql) in enumerate(QUERY_TEMPLATES.items()):
                with template_cols[i % 2]:
                    if st.button(template_name, key=f"template_{table['table_name']}_{i}"):
                        try:
                            query = template_sql.format(table=table['table_name'], column="id")
                            st.session_state.current_query = query
                            st.session_state.current_query_name = f"{template_name}: {table['table_name']}"
                            st.session_state.nav_page = "Query Workbench"
                            st.rerun()
                        except Exception as e:
                            st.error(f"Template error: {e}")

def show_query_workbench():
    """Query Workbench Page"""
    st.header("🔧 Query Workbench")
    st.write("Execute read-only SQL queries and explore results")
    
    # Query Editor
    st.subheader("SQL Editor")
    
    col1, col2 = st.columns([4, 1])
    with col1:
        query_name = st.text_input(
            "Query Name (optional)",
            value=st.session_state.current_query_name,
            placeholder="My Query"
        )
    with col2:
        limit = st.number_input("Row Limit", min_value=1, max_value=200, value=st.session_state.current_limit)
    
    # SQL Editor with syntax highlighting
    sql_query = st.text_area(
        "SQL Query",
        value=st.session_state.current_query,
        height=200,
        placeholder="SELECT * FROM your_table LIMIT 100",
        key="sql_editor"
    )
    
    # Query Controls
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🚀 Execute Query", type="primary"):
            if not sql_query.strip():
                st.error("Please enter a SQL query")
            else:
                execute_query(sql_query, query_name, limit)
    
    with col2:
        if st.button("💾 Save Query"):
            if not sql_query.strip():
                st.error("Please enter a SQL query")
            elif not query_name.strip():
                st.error("Please provide a query name")
            else:
                save_query(query_name, sql_query)
    
    with col3:
        if st.button("📋 Load Template"):
            show_query_templates()
    
    st.divider()
    
    # Query History
    if st.session_state.query_history:
        st.subheader("Recent Queries")
        for i, (hist_name, hist_sql, hist_time) in enumerate(reversed(st.session_state.query_history[-5:])):
            with st.expander(f"🕒 {hist_time} - {hist_name or 'Unnamed Query'}"):
                st.code(hist_sql, language="sql")
                if st.button("Re-run", key=f"rerun_{i}"):
                    st.session_state.current_query = hist_sql
                    st.session_state.current_query_name = hist_name
                    st.rerun()

def execute_query(sql, name, limit):
    """Execute SQL query and display results"""
    with st.spinner("Executing query..."):
        start_time = time.time()
        result = api_post("/query", {
            "sql": sql,
            "name": name,
            "limit": limit
        })
        duration = time.time() - start_time
    
    if not result:
        return
    
    # Store in history
    st.session_state.query_history.append((name, sql, datetime.now().strftime("%H:%M:%S")))
    
    # Display Results
    st.subheader("Query Results")
    
    if "error" in result:
        st.error(f"Query Error: {result['error']}")
        return
    
    # Success metrics
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Rows Returned", result.get("rowCount", 0))
    with col2:
        st.metric("Duration", f"{result.get('durationMs', 0)} ms")
    with col3:
        st.metric("Columns", len(result.get("columns", [])))
    
    # Results Table
    if result.get("rows"):
        df = pd.DataFrame(result["rows"])
        if df.empty:
            st.info("No rows returned")
        else:
            st.dataframe(df, use_container_width=True)
            
            # Export Options
            col1, col2 = st.columns(2)
            with col1:
                csv = df.to_csv(index=False)
                st.download_button(
                    label="📥 Download CSV",
                    data=csv,
                    file_name=f"neonscope_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv"
                )
            with col2:
                json_data = df.to_json(orient="records", indent=2)
                st.download_button(
                    label="📥 Download JSON",
                    data=json_data,
                    file_name=f"neonscope_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json"
                )
    else:
        st.info("Query executed successfully but returned no data")

def save_query(name, sql):
    """Save query to database"""
    result = api_post("/saved", {
        "name": name,
        "sql": sql
    })
    
    if result and result.get("query"):
        st.success(f"✅ Query '{name}' saved successfully!")
        st.session_state.saved_queries.insert(0, result["query"])
    else:
        st.error("Failed to save query")

def show_saved_queries():
    """Saved Queries Page"""
    st.header("💾 Saved Queries")
    st.write("Manage and re-run your saved queries")
    
    # Refresh saved queries
    if st.button("🔄 Refresh Saved Queries"):
        with st.spinner("Loading saved queries..."):
            result = api_get("/saved")
            if result and result.get("queries"):
                st.session_state.saved_queries = result["queries"]
                st.success("Queries refreshed!")
            else:
                st.session_state.saved_queries = []
    
    # Load saved queries if not already loaded
    if not st.session_state.saved_queries:
        with st.spinner("Loading saved queries..."):
            result = api_get("/saved")
            if result and result.get("queries"):
                st.session_state.saved_queries = result["queries"]
    
    if not st.session_state.saved_queries:
        st.info("No saved queries yet. Create your first query in the Query Workbench!")
        return
    
    # Display saved queries
    for query in st.session_state.saved_queries:
        with st.expander(f"📋 {query['name']}"):
            st.code(query['sql_text'], language="sql")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                if st.button("🚀 Run Query", key=f"run_{query['id']}"):
                    st.session_state.current_query = query['sql_text']
                    st.session_state.current_query_name = query['name']
                    st.session_state.nav_page = "Query Workbench"
                    st.rerun()

            with col2:
                if st.button("📝 Edit", key=f"edit_{query['id']}"):
                    st.session_state.current_query = query['sql_text']
                    st.session_state.current_query_name = query['name']
                    st.session_state.nav_page = "Query Workbench"
                    st.rerun()
            
            with col3:
                if st.button("🗑️ Delete", key=f"delete_{query['id']}"):
                    result = api_delete(f"/saved/{query['id']}")
                    if result and result.get("ok"):
                        st.session_state.saved_queries = [q for q in st.session_state.saved_queries if q['id'] != query['id']]
                        st.success("Query deleted!")
                        st.rerun()
                    else:
                        st.error("Failed to delete query")

def show_audit_history():
    """Audit History Page"""
    st.header("📊 Audit History")
    st.write("Review past query executions and performance")
    
    # Load audit data
    with st.spinner("Loading audit history..."):
        result = api_get("/audit")
    
    if not result or not result.get("events"):
        st.info("No audit events yet. Execute some queries to see history!")
        return
    
    events = result["events"]
    
    # Audit Statistics
    total_queries = len(events)
    avg_duration = sum(e.get("duration_ms", 0) for e in events) / len(events) if events else 0
    total_rows = sum(e.get("row_count", 0) for e in events)
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Queries", total_queries)
    with col2:
        st.metric("Avg Duration", f"{avg_duration:.1f} ms")
    with col3:
        st.metric("Total Rows", f"{total_rows:,}")
    
    st.divider()
    
    # Audit Table
    st.subheader("Recent Activity")
    
    # Convert to DataFrame for display
    audit_data = []
    for event in events:
        audit_data.append({
            "Timestamp": event["created_at"],
            "Query Name": event.get("query_name", "Ad-hoc"),
            "Rows": event.get("row_count", 0),
            "Duration (ms)": event.get("duration_ms", 0)
        })
    
    df = pd.DataFrame(audit_data)
    if not df.empty:
        st.dataframe(df, use_container_width=True)
        
        # Export audit data
        csv = df.to_csv(index=False)
        st.download_button(
            label="📥 Export Audit History",
            data=csv,
            file_name=f"neonscope_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
    else:
        st.info("No audit data available")

def show_health_dashboard():
    """Health Dashboard Page"""
    st.header("❤️ Health Dashboard")
    st.write("Monitor database health and performance")
    
    # System Health
    st.subheader("System Health")
    
    # Check API and DB health
    api_health = api_get("/health")
    db_health = api_get("/health/db")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if api_health and api_health.get("ok"):
            st.success("✅ API Healthy")
        else:
            st.error("❌ API Unhealthy")
    
    with col2:
        if db_health and db_health.get("ok"):
            st.success("✅ Database Connected")
        else:
            st.error("❌ Database Connection Failed")
    
    st.divider()
    
    # Quick Diagnostics
    st.subheader("Quick Diagnostics")
    
    if st.button("🔍 Run Diagnostics"):
        with st.spinner("Running diagnostics..."):
            # Test query execution
            test_query = "SELECT 1 as test_value"
            test_result = api_post("/query", {
                "sql": test_query,
                "name": "Health Check",
                "limit": 1
            })
            
            if test_result and test_result.get("rows"):
                st.success("✅ Query execution working")
                st.json(test_result["rows"][0])
            else:
                st.error("❌ Query execution failed")
            
            # Test saved queries
            saved_result = api_get("/saved")
            if saved_result:
                st.success("✅ Saved queries accessible")
            else:
                st.warning("⚠️ Saved queries endpoint issue")
            
            # Test audit log
            audit_result = api_get("/audit")
            if audit_result:
                st.success("✅ Audit log accessible")
            else:
                st.warning("⚠️ Audit log endpoint issue")

def show_query_templates():
    """Show query template selector"""
    st.subheader("Query Templates")
    
    # Load tables for template placeholders
    tables_data = api_get("/tables")
    tables = tables_data.get("tables", []) if tables_data else []
    
    if not tables:
        st.warning("No tables available for templates")
        return
    
    # Template selector
    selected_table = st.selectbox("Select Table", [t["table_name"] for t in tables])
    selected_template = st.selectbox(
        "Select Template",
        list(QUERY_TEMPLATES.keys())
    )
    
    # Generate template
    template_sql = QUERY_TEMPLATES[selected_template]
    generated_sql = template_sql.format(table=selected_table, column="id")
    
    st.code(generated_sql, language="sql")
    
    if st.button("Use This Template"):
        st.session_state.current_query = generated_sql
        st.session_state.current_query_name = f"{selected_template}: {selected_table}"
        st.rerun()

if __name__ == "__main__":
    main()
