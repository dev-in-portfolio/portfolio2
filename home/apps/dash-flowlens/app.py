import os
from datetime import datetime, timedelta
import json

import pandas as pd
import plotly.graph_objects as go
from dash import Dash, dcc, html, Input, Output
import psycopg

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def get_conn():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg.connect(DATABASE_URL)


def query_events(days=30, stage=None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            params = [datetime.utcnow() - timedelta(days=days)]
            sql = """
                select entity_id, stage, entered_at, exited_at
                from flow_events
                where entered_at >= %s
            """
            if stage:
                sql += " and stage = %s"
                params.append(stage)
            cur.execute(sql, params)
            rows = cur.fetchall()
    return pd.DataFrame(rows, columns=["entity_id", "stage", "entered_at", "exited_at"])


def build_sankey(df):
    if df.empty:
        return go.Figure()
    stages = list(df["stage"].unique())
    stage_index = {stage: i for i, stage in enumerate(stages)}
    links = {}
    df = df.sort_values(["entity_id", "entered_at"])
    for entity, group in df.groupby("entity_id"):
        stages_seen = list(group["stage"])
        for i in range(len(stages_seen) - 1):
            pair = (stages_seen[i], stages_seen[i + 1])
            links[pair] = links.get(pair, 0) + 1
    source = [stage_index[a] for a, _ in links.keys()]
    target = [stage_index[b] for _, b in links.keys()]
    value = list(links.values())
    fig = go.Figure(
        data=[
            go.Sankey(
                node=dict(label=stages),
                link=dict(source=source, target=target, value=value),
            )
        ]
    )
    fig.update_layout(margin=dict(l=10, r=10, t=30, b=10))
    return fig


def build_dwell_heatmap(df):
    if df.empty:
        return go.Figure()
    df = df.copy()
    df["dwell_minutes"] = (df["exited_at"] - df["entered_at"]).dt.total_seconds() / 60.0
    summary = df.groupby("stage")["dwell_minutes"].mean().reset_index()
    fig = go.Figure(
        data=go.Heatmap(
            z=[summary["dwell_minutes"]],
            x=summary["stage"],
            y=["Avg dwell (min)"],
            colorscale="Reds",
        )
    )
    fig.update_layout(margin=dict(l=10, r=10, t=30, b=10))
    return fig


def build_throughput(df):
    if df.empty:
        return go.Figure()
    summary = df.groupby("stage")["entity_id"].count().reset_index(name="count")
    fig = go.Figure(data=go.Bar(x=summary["stage"], y=summary["count"]))
    fig.update_layout(margin=dict(l=10, r=10, t=30, b=10))
    return fig


def build_dropoff(df):
    if df.empty:
        return pd.DataFrame(columns=["stage", "next_stage", "completion_rate"])
    df = df.sort_values(["entity_id", "entered_at"])
    rows = []
    for entity, group in df.groupby("entity_id"):
        stages = list(group["stage"])
        for i in range(len(stages) - 1):
            rows.append((stages[i], stages[i + 1]))
    if not rows:
        return pd.DataFrame(columns=["stage", "next_stage", "completion_rate"])
    trans_df = pd.DataFrame(rows, columns=["stage", "next_stage"])
    counts = trans_df.groupby(["stage", "next_stage"]).size().reset_index(name="count")
    total = trans_df.groupby("stage").size().reset_index(name="total")
    merged = counts.merge(total, on="stage")
    merged["completion_rate"] = (merged["count"] / merged["total"]).round(2)
    return merged


app = Dash(__name__)
app.title = "FlowLens"

app.layout = html.Div(
    className="container",
    children=[
        html.H1("FlowLens"),
        html.P("Visualize pipeline flow, dwell time, and drop-offs."),
        html.Div(
            className="controls",
            children=[
                html.Label("Lookback (days)"),
                dcc.Slider(7, 60, step=1, value=30, id="days"),
                html.Label("Stage filter"),
                dcc.Input(id="stage", placeholder="optional stage"),
            ],
        ),
        html.Div(className="grid", children=[
            dcc.Graph(id="sankey"),
            dcc.Graph(id="heatmap"),
            dcc.Graph(id="throughput"),
        ]),
        html.H2("Drop-off rates"),
        html.Div(id="dropoff-table"),
    ],
)


@app.callback(
    Output("sankey", "figure"),
    Output("heatmap", "figure"),
    Output("throughput", "figure"),
    Output("dropoff-table", "children"),
    Input("days", "value"),
    Input("stage", "value"),
)
def update_charts(days, stage):
    df = query_events(days=days, stage=stage or None)
    sankey = build_sankey(df)
    heatmap = build_dwell_heatmap(df)
    throughput = build_throughput(df)
    dropoff = build_dropoff(df)
    table = html.Table(
        [html.Tr([html.Th(col) for col in dropoff.columns])]
        + [
            html.Tr([html.Td(dropoff.iloc[i][col]) for col in dropoff.columns])
            for i in range(len(dropoff))
        ]
    )
    return sankey, heatmap, throughput, table


if __name__ == "__main__":
    app.run_server(host="0.0.0.0", port=8050, debug=False)
