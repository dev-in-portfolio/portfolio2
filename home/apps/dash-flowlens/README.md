# Dash FlowLens

Pipeline flow analytics with Sankey, dwell heatmap, and drop-off rates.

## Features
- Flow visualization (Sankey)
- Bottleneck detection (dwell heatmap)
- Throughput by stage
- Drop-off rate table

## Setup
1. Create `.env` with `DATABASE_URL`
2. Apply SQL in `sql/001_flowlens.sql`
3. Install deps
   - `python3 -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
4. Run
   - `python app.py`
