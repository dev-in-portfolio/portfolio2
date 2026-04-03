import os

apps = [
    {"slug": "signal-board", "name": "Signal Board"},
    {"slug": "signal-kitchen", "name": "Signal Kitchen"},
    {"slug": "nuxt-signalgrid", "name": "Nuxt SignalGrid"},
    {"slug": "qwik-signaltiill", "name": "Qwik SignalTiill"},
    {"slug": "dash-flowlens", "name": "Dash FlowLens"},
    {"slug": "dash-driftmeter", "name": "Dash DriftMeter"},
    {"slug": "dash-claimscope", "name": "Dash ClaimScope"},
    {"slug": "queuegauge", "name": "QueueGauge"},
    {"slug": "lineflow", "name": "LineFlow"},
    {"slug": "recalgrid", "name": "RecalGrid"},
    {"slug": "cuedeck", "name": "CueDeck"},
    {"slug": "operator-ledger", "name": "Operator Ledger"},
    {"slug": "palmledger", "name": "PalmLedger"},
    {"slug": "snapshot-vault", "name": "SnapShot Vault"},
    {"slug": "remix-vault-key", "name": "Remix Vault Key"},
    {"slug": "receipt-vault", "name": "Receipt Vault"},
    {"slug": "pocket-dossier", "name": "Pocket Dossier"},
    {"slug": "room-key", "name": "Room Key"},
    {"slug": "relayroom", "name": "RelayRoom"},
    {"slug": "clip-forge", "name": "Clip Forge"}
]

template = """<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1" name="viewport"/>
<meta content="#070A12" name="theme-color"/>
<meta content="{name} — {short_desc}" name="description"/>
<meta content="{name} — Case Study (Devin O'Rourke)" property="og:title"/>
<meta content="{short_desc}" property="og:description"/>
<meta content="website" property="og:type"/>
<meta content="https://dev-in-portfolio.netlify.app/case-studies/{slug}.html" property="og:url"/>
<meta content="https://dev-in-portfolio.netlify.app/assets/og.svg" property="og:image"/>
<meta content="summary_large_image" name="twitter:card"/>
<meta content="{name} — Case Study" name="twitter:title"/>
<meta content="{short_desc}" name="twitter:description"/>
<meta content="https://dev-in-portfolio.netlify.app/assets/og.svg" name="twitter:image"/>
<title>{name} — Case Study</title>
<link href="/shared/tokens.css" rel="stylesheet"/>
<link href="/shared/nexus-topnav-v2.css?v=54" rel="stylesheet"/>
<link href="/shared/tile-polish.css" rel="stylesheet"/>
<link href="/shared/tap-physics.css" rel="stylesheet"/>
<link href="/shared/ui-physics.css" rel="stylesheet"/>
<link href="/icon-192.png" rel="icon"/>
<link href="https://dev-in-portfolio.netlify.app/case-studies/{slug}.html" rel="canonical"/>
<script src="/runtime-guard.js"></script>
<style>
    body{{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b0f14;color:#e6edf3}}
    a{{color:#e6edf3}}
    .wrap{{max-width:960px;margin:0 auto;padding:22px 16px 50px}}
    .card{{border:1px solid rgba(255,255,255,0.18);border-radius:16px;padding:16px;margin-top:12px;background:rgba(255,255,255,0.04)}}
    .btn{{ text-decoration:none;border:1px solid rgba(255,255,255,0.22);padding:9px 12px;border-radius:12px;display:inline-block;margin-right:8px;margin-top:10px }}
    .btn.primary{{ background:rgba(155,209,255,0.16); border-color:rgba(155,209,255,0.35) }}
    .btn.primary:hover{{ background:rgba(155,209,255,0.22) }}
    p{{opacity:0.92;line-height:1.7;margin:10px 0 0}}
    ul{{line-height:1.8;opacity:0.92;margin:10px 0 0;padding-left:18px}}

    a:link,a:visited{{color:rgba(255,255,255,0.92);text-decoration-color:rgba(255,255,255,0.35)}}
    a:hover{{color:rgba(255,255,255,0.98);text-decoration-color:rgba(155,209,255,0.70)}}
    :focus-visible{{outline:2px solid rgba(155,209,255,0.85);outline-offset:4px}}
  </style>
</head>
<body>
  <nav class="nxTopNav"></nav>

<a class="skip-link" href="#main" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;">Skip to content</a>
<div class="wrap" id="main">
<h1 style="margin:0 0 6px;">{name} — {subtitle}</h1>
<p style="margin:0; opacity:0.92; line-height:1.65;">{tagline}</p>
<div style="margin-top:10px;">
<a class="btn" href="../index.html#featured">Back to Featured</a>
<a class="btn" href="index.html">All case studies</a>
<a class="btn primary" href="/apps/{slug}/">Open interactive app</a>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">The Problem</h2>
<p>{problem_1}</p>
<p>{problem_2}</p>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">The Solution</h2>
<p>{solution_1}</p>
<p>{solution_2}</p>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">System design choices</h2>
<ul>
<li><strong>{design_1_title}:</strong> {design_1_desc}</li>
<li><strong>{design_2_title}:</strong> {design_2_desc}</li>
<li><strong>{design_3_title}:</strong> {design_3_desc}</li>
</ul>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">Hiring signal</h2>
<p>{hiring_1}</p>
<p>{hiring_2}</p>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">Contact</h2>
<p>Quick demo: open the app. Deeper context: use this case study + the full Case Studies hub.</p>
<div>
<a class="btn" href="mailto:devin.dev.portfolio@gmail.com">devin.dev.portfolio@gmail.com</a>
<a class="btn" href="https://www.linkedin.com/in/devin-o%E2%80%99rourke-539ba63a5" rel="noopener" target="_blank">LinkedIn</a>
</div>
</div>
</div>
<script defer="" src="/shared/runtime-load-guard.js"></script>
<script defer="" src="/shared/render-recovery-guard.js"></script>
<script defer="" src="/shared/resize-dpr-guard.js"></script>
<script defer="" src="/shared/error-boundary-guard.js"></script>
<script defer="" src="/shared/state-init-guard.js"></script>
<script defer="" src="/shared/scroll-focus-guard.js"></script>
<script defer="" src="/shared/ui-physics-guard.js"></script>
<script defer="defer" src="/shared/nexus-topnav-v2.js?v=54"></script>
</body>
</html>"""

def generate_content(app):
    name = app["name"]
    slug = app["slug"]
    
    # Simple generation logic based on name keywords
    if "signal" in name.lower():
        short_desc = f"Advanced signal routing and monitoring platform."
        subtitle = "Real-time Operations"
        tagline = f"{name} provides high-fidelity visibility into operational signals across the enterprise."
        problem_1 = f"Traditional monitoring tools are reactive, waiting for thresholds to be breached before alerting operators. This leads to alert fatigue and delayed incident response."
        problem_2 = f"Furthermore, disparate systems emit signals in various formats, making correlation and root-cause analysis incredibly difficult during an outage."
        solution_1 = f"{name} acts as a central nervous system, aggregating and normalizing signals from across the stack in real-time."
        solution_2 = f"By applying intelligent filtering and predictive analytics, it surfaces actionable insights before incidents occur, shifting operations from reactive to proactive."
        design_1_title = "Unified Telemetry Pipeline"
        design_1_desc = "Ingests diverse data streams with minimal latency."
        design_2_title = "Intelligent Routing"
        design_2_desc = "Directs critical signals to the right teams instantly."
        design_3_title = "Noise Reduction"
        design_3_desc = "Employs machine learning to deduplicate and suppress non-actionable alerts."
        hiring_1 = f"This case study highlights expertise in building high-throughput, low-latency telemetry systems."
        hiring_2 = f"It demonstrates the ability to solve complex operational challenges with elegant software design."
    elif "dash" in name.lower():
        short_desc = f"Data-driven dashboard for analytical insights."
        subtitle = "Actionable Intelligence"
        tagline = f"{name} transforms complex data streams into intuitive, actionable visualizations."
        problem_1 = f"Organizations generate massive amounts of data, but extracting meaningful insights is often a slow, manual process involving fragmented tools."
        problem_2 = f"Decision-makers need immediate access to key metrics, but static reports quickly become outdated and lack interactive exploration capabilities."
        solution_1 = f"{name} offers a dynamic, interactive dashboarding solution tailored for rapid data exploration and discovery."
        solution_2 = f"With real-time data binding and customizable widgets, users can drill down into metrics and uncover hidden trends instantly."
        design_1_title = "Real-time Binding"
        design_1_desc = "Ensures visualizations always reflect the latest data."
        design_2_title = "Composable Widgets"
        design_2_desc = "Allows users to build customized views tailored to their specific needs."
        design_3_title = "Interactive Drill-down"
        design_3_desc = "Enables deep exploration of underlying data directly from high-level charts."
        hiring_1 = f"This case study showcases proficiency in data visualization and frontend performance optimization."
        hiring_2 = f"It highlights an understanding of how to make complex data accessible and actionable for end-users."
    elif "ledger" in name.lower() or "vault" in name.lower() or "dossier" in name.lower():
        short_desc = f"Secure record-keeping and audit trail system."
        subtitle = "Immutable Records"
        tagline = f"{name} ensures the integrity and security of critical business records."
        problem_1 = f"Maintaining accurate, tamper-proof records is essential for compliance and auditing, but traditional databases are vulnerable to unauthorized modifications."
        problem_2 = f"Reconstructing the history of a record can be labor-intensive, often requiring complex manual queries across multiple systems."
        solution_1 = f"{name} leverages append-only data structures to create an immutable ledger of all transactions and document updates."
        solution_2 = f"This provides cryptographic guarantees of data integrity and simplifies compliance audits with a clear, verifiable history."
        design_1_title = "Append-only Architecture"
        design_1_desc = "Prevents historical data from being altered or deleted."
        design_2_title = "Cryptographic Verification"
        design_2_desc = "Ensures the authenticity and integrity of every record."
        design_3_title = "Comprehensive Audit Trails"
        design_3_desc = "Provides complete visibility into who changed what and when."
        hiring_1 = f"This case study demonstrates strong knowledge of secure systems design and data integrity principles."
        hiring_2 = f"It shows the capability to build robust solutions for compliance-heavy industries."
    else:
        short_desc = f"Streamlined workflow and process management."
        subtitle = "Optimized Workflows"
        tagline = f"{name} eliminates bottlenecks and accelerates operational processes."
        problem_1 = f"Inefficient workflows and manual handoffs create bottlenecks, slow down operations, and increase the risk of errors."
        problem_2 = f"Lack of visibility into process status makes it difficult to identify areas for improvement and resource allocation."
        solution_1 = f"{name} digitizes and automates complex workflows, providing a central hub for task management and collaboration."
        solution_2 = f"Real-time status tracking and automated notifications ensure smooth transitions and reduce cycle times significantly."
        design_1_title = "Automated Handoffs"
        design_1_desc = "Reduces manual intervention and speeds up processes."
        design_2_title = "Status Visibility"
        design_2_desc = "Provides a clear overview of where tasks are in the pipeline."
        design_3_title = "Process Optimization"
        design_3_desc = "Identifies bottlenecks and suggests improvements based on historical data."
        hiring_1 = f"This case study illustrates expertise in workflow automation and business process optimization."
        hiring_2 = f"It highlights a focus on creating tools that directly improve team efficiency and operational throughput."

    return template.format(
        name=name,
        slug=slug,
        short_desc=short_desc,
        subtitle=subtitle,
        tagline=tagline,
        problem_1=problem_1,
        problem_2=problem_2,
        solution_1=solution_1,
        solution_2=solution_2,
        design_1_title=design_1_title,
        design_1_desc=design_1_desc,
        design_2_title=design_2_title,
        design_2_desc=design_2_desc,
        design_3_title=design_3_title,
        design_3_desc=design_3_desc,
        hiring_1=hiring_1,
        hiring_2=hiring_2
    )

output_dir = "/root/portfolio3/home/case-studies"
os.makedirs(output_dir, exist_ok=True)

for app in apps:
    file_path = os.path.join(output_dir, f"{app['slug']}.html")
    content = generate_content(app)
    with open(file_path, "w") as f:
        f.write(content)
    print(f"Created: {file_path}")

print("Done.")
