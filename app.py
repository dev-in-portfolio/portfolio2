import os
import streamlit as st
import pandas as pd

import db
from db import create_dataset, insert_stops, list_datasets, list_stops, update_stop
from exporters import export_csv, export_duplicates, export_review
from normalize import normalize_address
from qa import qa_flags, duplicate_addresses
from scoring import score_bucket, score_stop

# Set page configuration
st.set_page_config(page_title="RouteForge Console", layout="wide")
st.set_option("browser.gatherUsageStats", False)

# Modern Dark Charcoal & Neon styling
st.markdown(
    """
    <style>
    /* Dark Theme Base Overrides */
    .stApp {
        background-color: #12131a;
        color: #f1f5f9;
    }
    
    /* Segmented Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: #0b0c10;
        padding: 8px;
        border-radius: 12px;
        border: 1px solid rgba(59, 130, 246, 0.15);
    }
    
    .stTabs [data-baseweb="tab"] {
        height: 38px;
        border-radius: 8px;
        padding-left: 16px;
        padding-right: 16px;
        background-color: transparent;
        border: none;
        color: #94a3b8;
        font-weight: 600;
        transition: all 0.2s ease;
    }
    
    .stTabs [aria-selected="true"] {
        background-color: rgba(59, 130, 246, 0.15) !important;
        color: #3b82f6 !important;
        border: 1px solid rgba(59, 130, 246, 0.25) !important;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.15);
    }
    
    /* Glowing Dropzone file uploader styling */
    [data-testid="stFileUploader"] {
        border: 2px dashed rgba(59, 130, 246, 0.3);
        border-radius: 16px;
        background-color: #161720;
        padding: 24px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
        margin-bottom: 20px;
    }
    
    [data-testid="stFileUploader"]:hover {
        border-color: #10b981;
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
        background-color: #181a24;
    }
    
    /* Card layouts */
    .qa-card {
        background-color: #1a1c26;
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }
    
    .review-card {
        background-color: #191a24;
        border: 1px solid rgba(245, 158, 11, 0.25);
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }
    
    .review-card.clean {
        border-color: rgba(16, 185, 129, 0.25);
    }

    .badge-alert {
        display: inline-block;
        padding: 3px 10px;
        font-size: 0.75rem;
        font-weight: 700;
        color: #fef3c7;
        background-color: rgba(245, 158, 11, 0.2);
        border: 1px solid rgba(245, 158, 11, 0.4);
        border-radius: 99px;
        margin-bottom: 8px;
    }
    
    .badge-success {
        display: inline-block;
        padding: 3px 10px;
        font-size: 0.75rem;
        font-weight: 700;
        color: #ecfdf5;
        background-color: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.4);
        border-radius: 99px;
        margin-bottom: 8px;
    }

    .mono-text {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.85rem;
        background: #090a0f;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.03);
    }
    </style>
    """,
    unsafe_allow_html=True
)

def gate() -> bool:
    passcode = os.getenv("APP_PASSCODE", "")
    if not passcode:
        st.sidebar.info("Passcode gate disabled.")
        return True
    st.sidebar.markdown("### Access Gate")
    attempt = st.sidebar.text_input("Passcode", type="password")
    if attempt != passcode:
        st.sidebar.error("Passcode required.")
        return False
    return True

# Sidebar header & Database state tag
st.sidebar.title("RouteForge Console")
st.sidebar.caption("QA + scoring console for routing datasets.")

db_connected = db.check_db_connection()
if db_connected:
    st.sidebar.markdown(
        '<div class="status-tag" style="color:#10b981; font-weight:700;">● Database Connected</div>',
        unsafe_allow_html=True
    )
else:
    st.sidebar.markdown(
        '<div class="status-tag" style="color:#f59e0b; font-weight:700;">● Offline Local Backup</div>',
        unsafe_allow_html=True
    )

if not gate():
    st.stop()

datasets = list_datasets()
dataset_names = [d[1] for d in datasets]
dataset = st.sidebar.selectbox("Dataset selection", dataset_names) if datasets else None
dataset_id = next((d[0] for d in datasets if d[1] == dataset), None)

tab_ds, tab_import, tab_qa, tab_review, tab_export = st.tabs(
    ["📁 Datasets", "📥 Import Dataset", "📊 QA Dashboard", "🛠 Review Queue", "💾 Export Data"]
)

with tab_ds:
    st.subheader("Manage Datasets")
    st.markdown("Create new dataset groups to manage stops, routing iterations, and profile statistics.")
    
    col_create, col_list = st.columns([1, 2])
    
    with col_create:
        st.write("##### Create Dataset")
        name = st.text_input("New dataset name", placeholder="e.g. NYC Deliveries Q3")
        if st.button("Create dataset") and name:
            create_dataset(name)
            st.success("Dataset created successfully.")
            st.rerun()
            
    with col_list:
        st.write("##### Active Datasets")
        if not datasets:
            st.info("No datasets registered yet. Create one using the form on the left.")
        else:
            df_ds = pd.DataFrame(datasets, columns=["ID", "Name", "Created At"])
            st.dataframe(df_ds, use_container_width=True)

with tab_import:
    st.subheader("Import Stops CSV")
    if not dataset_id:
        st.info("Create or select a dataset from the sidebar first.")
    else:
        st.write(f"Upload and import CSV entries into: **{dataset}**")
        st.markdown(
            "Expected headers: `name`, `address`, `city`, `state`, `zip`, `lat`, `lon`, `notes`, `source`"
        )
        uploaded = st.file_uploader("Drag & drop routing CSV file here", type=["csv"])
        if uploaded:
            if st.button("Import now", type="primary"):
                try:
                    df = pd.read_csv(uploaded)
                    df = df.fillna("")
                    rows = df.to_dict(orient="records")
                    insert_stops(dataset_id, rows)
                    st.success(f"Successfully imported {len(rows)} stops into {dataset}.")
                except Exception as e:
                    st.error(f"Failed to import data: {e}")

with tab_qa:
    st.subheader("QA Dashboard & Profiling Metrics")
    if not dataset_id:
        st.info("Please select a dataset from the sidebar.")
    else:
        stops_raw = list_stops(dataset_id)
        if not stops_raw:
            st.info("Active dataset contains no stop records. Import data in the Import tab.")
        else:
            rows = [
                dict(
                    zip(
                        ["id", "name", "address", "city", "state", "zip", "lat", "lon", "notes", "source"],
                        r,
                    )
                )
                for r in stops_raw
            ]
            
            # Metrics cards row
            col_total, col_dupes, col_flags = st.columns(3)
            df_stops = pd.DataFrame(rows)
            
            flags = qa_flags(rows)
            dupes = duplicate_addresses(rows)
            
            col_total.metric("Total Stops", len(rows))
            col_dupes.metric("Duplicate Addresses", len(dupes))
            col_flags.metric("QA Warning Flags", len(flags))
            
            st.write("---")
            
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                st.write("##### Missing Values by Field")
                # Calculate empty values ratio
                null_counts = {}
                for col in ["name", "address", "city", "state", "zip", "notes"]:
                    null_counts[col] = df_stops[df_stops[col].astype(str).str.strip() == ""].shape[0]
                
                null_df = pd.DataFrame(list(null_counts.items()), columns=["Field", "Missing Count"])
                st.bar_chart(null_df.set_index("Field"), color="#3b82f6")
                
            with col_chart2:
                st.write("##### Stops distribution by State")
                state_counts = df_stops[df_stops["state"].str.strip() != ""]["state"].value_counts().reset_index()
                state_counts.columns = ["State", "Count"]
                if not state_counts.empty:
                    st.bar_chart(state_counts.set_index("State"), color="#10b981")
                else:
                    st.info("No state data available.")
            
            st.write("---")
            st.write("##### Registered QA Warning Flags")
            if flags:
                st.json(flags)
            else:
                st.success("No critical QA warning flags found in this dataset!")

with tab_review:
    st.subheader("Tactile Review Queue")
    st.markdown("Edit and approve stops flagged as having invalid coordinates, addresses, or metadata.")
    
    if not dataset_id:
        st.info("Select a dataset.")
    else:
        stops_raw = list_stops(dataset_id)
        if not stops_raw:
            st.info("Active dataset contains no stop records. Import data in the Import tab.")
        else:
            rows = [
                dict(
                    zip(
                        ["id", "name", "address", "city", "state", "zip", "lat", "lon", "notes", "source"],
                        r,
                    )
                )
                for r in stops_raw
            ]
            
            scored = []
            for row in rows:
                score = score_stop(row)
                scored.append({**row, "score": score, "bucket": score_bucket(score)})
            
            df = pd.DataFrame(scored)
            review = df[df["bucket"] == "Needs review"]
            
            if review.empty:
                st.success("All stops in this dataset are approved! No review queue required.")
            else:
                st.write(f"Stops requiring manual QA inspection: **{len(review)}**")
                
                # Loop through need-review items and render collapsible cards
                for idx, row in review.iterrows():
                    # Calculate warning details
                    warnings = []
                    if not row["city"]: warnings.append("City field is missing")
                    if not row["state"]: warnings.append("State field is missing")
                    if not row["zip"]: warnings.append("ZIP Code field is missing")
                    try:
                        lat_val = float(row["lat"]) if row["lat"] != "" and row["lat"] is not None else None
                        lon_val = float(row["lon"]) if row["lon"] != "" and row["lon"] is not None else None
                        if lat_val is None or lon_val is None:
                            warnings.append("Missing Lat/Lon coordinates")
                        elif not (-90 <= lat_val <= 90) or not (-180 <= lon_val <= 180):
                            warnings.append("Coordinates are out of boundaries")
                    except Exception:
                        warnings.append("Coordinates format error")
                    
                    # Create card container markup
                    with st.expander(f"📍 Stop: {row['name']} — {row['address']}", expanded=True):
                        st.markdown(
                            f'<div class="review-card">',
                            unsafe_allow_html=True
                        )
                        
                        # Warning Badges
                        for w in warnings:
                            st.markdown(f'<span class="badge-alert">⚠️ {w}</span>', unsafe_allow_html=True)
                            
                        st.write("##### Edit Stop Parameters")
                        
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            new_city = st.text_input("City", row["city"], key=f"city-{row['id']}")
                        with col2:
                            new_state = st.text_input("State", row["state"], key=f"state-{row['id']}")
                        with col3:
                            new_zip = st.text_input("ZIP Code", row["zip"], key=f"zip-{row['id']}")
                            
                        new_notes = st.text_area("Reviewer Notes", row["notes"], key=f"notes-{row['id']}", rows=3)
                        
                        if st.button("✓ Save & Approve Stop", key=f"btn-{row['id']}", type="primary"):
                            update_stop(
                                row["id"],
                                {
                                    "city": new_city,
                                    "state": new_state,
                                    "zip": new_zip,
                                    "notes": new_notes
                                }
                            )
                            st.success(f"Approved stop: {row['name']}")
                            st.rerun()
                            
                        st.markdown('</div>', unsafe_allow_html=True)

with tab_export:
    st.subheader("Data Export Operations")
    if not dataset_id:
        st.info("Select a dataset.")
    else:
        stops_raw = list_stops(dataset_id)
        if not stops_raw:
            st.info("Active dataset contains no stop records. Import data in the Import tab.")
        else:
            rows = [
                dict(
                    zip(
                        ["id", "name", "address", "city", "state", "zip", "lat", "lon", "notes", "source"],
                        r,
                    )
                )
                for r in stops_raw
            ]
            
            st.write("Download certified, cleaned, or review data tables for external routing routers.")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.write("##### Cleaned Dataset")
                st.caption("Contains all successfully scored and validated stops.")
                st.download_button(
                    "Download Cleaned CSV",
                    export_csv(rows),
                    file_name="cleaned.csv",
                    use_container_width=True
                )
                
            with col2:
                st.write("##### Duplicate Reports")
                st.caption("Logs of all matching identical address inputs.")
                dupes = duplicate_addresses(rows)
                st.download_button(
                    "Download Duplicates CSV",
                    export_duplicates(dupes),
                    file_name="duplicates.csv",
                    use_container_width=True
                )
                
            with col3:
                st.write("##### Review Queue")
                st.caption("Dump file containing all flags marked for manual correction.")
                st.download_button(
                    "Download Needs-Review CSV",
                    export_review(rows),
                    file_name="needs_review.csv",
                    use_container_width=True
                )
