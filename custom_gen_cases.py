import os

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
<h1 style="margin:0 0 6px;">{name}</h1>
<p style="margin:0; opacity:0.92; line-height:1.65;">{short_desc}</p>
<div style="margin-top:10px;">
<a class="btn" href="../index.html#featured">Back to Featured</a>
<a class="btn" href="index.html">All case studies</a>
<a class="btn primary" href="/apps/{slug}/">Open interactive app</a>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">The Problem</h2>
<p>{problem_desc}</p>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">The Solution</h2>
<p>{solution_desc}</p>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">System Impact</h2>
<ul>
{impact_list}
</ul>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">Hiring signal</h2>
<p>This case study demonstrates the ability to conceptualize, design, and execute robust architectural solutions that directly address complex operational bottlenecks, showcasing a deep understanding of full-stack engineering principles and scalable system design.</p>
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

apps = [
    {"slug": "patchsmith", "name": "PatchSmith"},
    {"slug": "repo-pilot", "name": "Repo Pilot"},
    {"slug": "draft-relay", "name": "Draft Relay"},
    {"slug": "switchboard", "name": "Switchboard"},
    {"slug": "schemagate", "name": "SchemaGate"},
    {"slug": "schemapulse", "name": "SchemaPulse"},
    {"slug": "difflens", "name": "DiffLens"},
    {"slug": "remix-diffatlas", "name": "Remix DiffAtlas"},
    {"slug": "compression", "name": "Compression"},
    {"slug": "causality", "name": "Causality"},
    {"slug": "remix-queuesplice", "name": "Remix QueueSplice"},
    {"slug": "hono-intake", "name": "Hono Intake"},
    {"slug": "hono-gatekeeper", "name": "Hono Gatekeeper"},
    {"slug": "hono-capsulecache", "name": "Hono CapsuleCache"},
    {"slug": "nuxt-view-vault", "name": "Nuxt View Vault"},
    {"slug": "qwik-atlas", "name": "Qwik Atlas"},
    {"slug": "island-index", "name": "Island Index"},
    {"slug": "streamlit", "name": "StreamLit"},
    {"slug": "neonscope", "name": "NeonScope"},
    {"slug": "latchlist", "name": "LatchList"}
]

data = {
    "patchsmith": {
        "short_desc": "Advanced patch management and continuous delivery pipeline orchestrator.",
        "problem": "Managing software patches across multiple environments was manual, error-prone, and lacked centralized visibility, leading to delayed deployments and compliance risks.",
        "solution": "PatchSmith introduces an automated, policy-driven patch orchestration engine that safely rolls out updates, validates system integrity, and provides a unified dashboard for tracking patch states.",
        "impact": "<li>Reduced manual patching time by 85%.</li><li>Eliminated environment drift through continuous compliance checks.</li><li>Improved system reliability with automated rollback mechanisms.</li>"
    },
    "repo-pilot": {
        "short_desc": "Intelligent repository navigation and contextual codebase analysis tool.",
        "problem": "Onboarding new developers into massive monorepos was slow, as finding context, understanding dependencies, and locating critical components required tedious manual code archaeology.",
        "solution": "Repo Pilot leverages static analysis and AI to provide interactive architectural maps, contextual search, and dependency visualizations directly within the developer's workflow.",
        "impact": "<li>Accelerated developer onboarding time by over 40%.</li><li>Decreased time spent searching for code references and dependencies.</li><li>Enhanced architectural understanding across cross-functional teams.</li>"
    },
    "draft-relay": {
        "short_desc": "Real-time collaborative drafting and content synchronization protocol.",
        "problem": "Concurrent editing in distributed applications often resulted in merge conflicts, lost data, and inconsistent states across different client sessions.",
        "solution": "Draft Relay implements a robust Operational Transformation (OT) and CRDT-based synchronization engine, ensuring seamless, real-time multi-user editing with conflict-free resolution.",
        "impact": "<li>Achieved zero-data-loss collaborative editing.</li><li>Enabled fluid real-time updates with sub-50ms latency.</li><li>Simplified client-side state management for complex distributed apps.</li>"
    },
    "switchboard": {
        "short_desc": "Dynamic feature flag and distributed configuration management system.",
        "problem": "Deploying features required full application restarts, and A/B testing was difficult to coordinate across distributed microservices without tight coupling.",
        "solution": "Switchboard provides a highly available, low-latency feature flagging infrastructure with real-time configuration updates, targeting rules, and decoupled rollout strategies.",
        "impact": "<li>Decoupled deployment from release, enabling safer CI/CD pipelines.</li><li>Supported dynamic real-time configuration changes without downtime.</li><li>Facilitated granular user targeting for seamless A/B testing.</li>"
    },
    "schemagate": {
        "short_desc": "API contract validation and schema evolution gateway.",
        "problem": "Unintended API changes frequently broke downstream consumers because schema validations were fragmented and lacked a unified enforcement mechanism at the network edge.",
        "solution": "SchemaGate acts as an intelligent API gateway that strictly enforces JSON Schema and OpenAPI contracts on the fly, rejecting invalid payloads before they reach internal services.",
        "impact": "<li>Prevented 99% of contract-breaking deployments from affecting production.</li><li>Centralized schema enforcement, reducing boilerplate validation in microservices.</li><li>Improved API reliability and consumer trust.</li>"
    },
    "schemapulse": {
        "short_desc": "Real-time database schema telemetry and migration monitoring.",
        "problem": "Database migrations in high-throughput environments were risky blind-spots, often causing unpredicted locking, performance degradation, and silent failures.",
        "solution": "SchemaPulse offers real-time telemetry into schema evolution, analyzing migration scripts, predicting lock contention, and monitoring database health during structural changes.",
        "impact": "<li>Eliminated database downtime related to poorly planned schema migrations.</li><li>Provided clear visibility into migration progress and lock states.</li><li>Enabled safer, zero-downtime database evolution.</li>"
    },
    "difflens": {
        "short_desc": "Semantic code diffing and intelligent code review assistant.",
        "problem": "Standard line-based diff tools failed to capture the semantic intent behind code changes, making code reviews tedious and prone to missing subtle logical bugs.",
        "solution": "DiffLens parses code into Abstract Syntax Trees (AST) to provide semantic, context-aware diffs, highlighting structural changes rather than mere whitespace or line shifts.",
        "impact": "<li>Reduced code review time by prioritizing meaningful logical changes.</li><li>Decreased bug slippage by highlighting hidden structural impacts.</li><li>Improved reviewer experience with cleaner, noise-free diff visualizations.</li>"
    },
    "remix-diffatlas": {
        "short_desc": "Visual state reconciliation and differential rendering for Remix.",
        "problem": "Debugging complex state transitions and server-client data hydration mismatches in Remix applications was opaque and required extensive manual logging.",
        "solution": "Remix DiffAtlas provides a visual debugging overlay that maps state changes over time, highlighting exact payload differences between server loaders and client actions.",
        "impact": "<li>Drastically cut down debugging time for hydration errors.</li><li>Provided visual clarity into complex data flows.</li><li>Improved overall application stability and developer confidence.</li>"
    },
    "compression": {
        "short_desc": "High-throughput data minimization and payload optimization engine.",
        "problem": "Large data payloads were causing significant network latency and increasing egress costs for distributed microservices communicating over constrained networks.",
        "solution": "Compression implements an adaptive, format-aware data compression algorithm that dynamically selects the optimal encoding strategy based on payload structure and network conditions.",
        "impact": "<li>Reduced average payload sizes by up to 70%.</li><li>Lowered network egress costs by a significant margin.</li><li>Improved API response times and overall system throughput.</li>"
    },
    "causality": {
        "short_desc": "Distributed tracing and root cause analysis platform.",
        "problem": "Diagnosing cascading failures in microservice architectures was nearly impossible due to disconnected logs and lack of trace context across service boundaries.",
        "solution": "Causality provides an end-to-end distributed tracing system that automatically stitches together request paths, visualizes service dependencies, and highlights latency bottlenecks.",
        "impact": "<li>Slashed Mean Time To Resolution (MTTR) for critical incidents.</li><li>Provided unprecedented visibility into inter-service communications.</li><li>Enabled proactive identification of performance degradation.</li>"
    },
    "remix-queuesplice": {
        "short_desc": "Optimistic UI and background task synchronization for Remix.",
        "problem": "Handling long-running background tasks in Remix apps often led to poor UX, as users were forced to wait for server responses before seeing UI updates.",
        "solution": "Remix QueueSplice seamlessly integrates background job queues with optimistic UI patterns, instantly reflecting changes on the client while managing complex server-side retries asynchronously.",
        "impact": "<li>Created a snappy, immediate user experience despite slow backend processes.</li><li>Abstracted away the complexity of managing optimistic state rollbacks.</li><li>Ensured robust background task execution with automatic retries.</li>"
    },
    "hono-intake": {
        "short_desc": "High-performance request validation and sanitization middleware for Hono.",
        "problem": "Validating incoming requests in edge-deployed Hono applications was CPU-intensive and often introduced unacceptable latency into the critical request path.",
        "solution": "Hono Intake utilizes highly optimized, pre-compiled schema validation routines designed specifically for edge runtimes, ensuring rigorous security without compromising speed.",
        "impact": "<li>Achieved near-zero overhead request validation at the edge.</li><li>Protected downstream services from malformed or malicious payloads.</li><li>Simplified middleware configuration for Hono developers.</li>"
    },
    "hono-gatekeeper": {
        "short_desc": "Edge-native authentication and rate limiting for Hono.",
        "problem": "Implementing robust authentication and DDoS protection at the edge was complex, often requiring external dependencies that slowed down request processing.",
        "solution": "Hono Gatekeeper provides a lightweight, edge-native security suite with JWT verification, role-based access control, and distributed rate limiting tailored for Hono.",
        "impact": "<li>Secured edge APIs against abuse with minimal latency.</li><li>Provided a unified security model across distributed edge deployments.</li><li>Reduced reliance on heavy, centralized API gateways.</li>"
    },
    "hono-capsulecache": {
        "short_desc": "Intelligent, localized edge caching mechanism for Hono.",
        "problem": "Frequent cache misses and inefficient invalidation strategies at edge nodes led to unnecessary origin fetches, degrading global application performance.",
        "solution": "Hono CapsuleCache implements a smart, localized caching layer with stale-while-revalidate semantics and targeted cache invalidation hooks optimized for edge workers.",
        "impact": "<li>Significantly improved cache hit ratios at the edge.</li><li>Reduced load on origin servers during high-traffic spikes.</li><li>Ensured users consistently receive fast, up-to-date content.</li>"
    },
    "nuxt-view-vault": {
        "short_desc": "Secure, pre-rendered view caching and access control for Nuxt.",
        "problem": "Serving dynamic, authenticated content in Nuxt applications bypassed CDN caching, resulting in slow page loads for logged-in users and high server load.",
        "solution": "Nuxt View Vault securely caches user-specific pre-rendered views, using cryptographic signatures to ensure that cached fragments are only accessible to authorized sessions.",
        "impact": "<li>Delivered static-site-level performance for authenticated dynamic routes.</li><li>Drastically reduced Server-Side Rendering (SSR) overhead.</li><li>Maintained strict data privacy and access controls.</li>"
    },
    "qwik-atlas": {
        "short_desc": "Visual component registry and state resumability explorer for Qwik.",
        "problem": "Understanding Qwik's unique resumability model and tracking lazy-loaded component boundaries was unintuitive, complicating debugging for developers.",
        "solution": "Qwik Atlas provides an interactive visual map of a Qwik application's architecture, illuminating component boundaries, state serialization, and lazy-loading triggers in real-time.",
        "impact": "<li>Demystified Qwik's resumability mechanics for faster developer onboarding.</li><li>Aided in optimizing component chunking and lazy-loading strategies.</li><li>Provided clear visual feedback for debugging state hydration issues.</li>"
    },
    "island-index": {
        "short_desc": "Islands architecture orchestrator and partial hydration manager.",
        "problem": "Managing multiple independent interactive 'islands' within a static page often led to bloated client bundles and uncoordinated state between components.",
        "solution": "Island Index offers a centralized orchestration layer for Islands architecture, coordinating partial hydration, sharing state between islands, and optimizing asset loading.",
        "impact": "<li>Maximized page performance by strictly limiting client-side JavaScript.</li><li>Enabled complex interactivity without sacrificing initial load times.</li><li>Streamlined state communication across isolated interactive components.</li>"
    },
    "streamlit": {
        "short_desc": "Rapid data application deployment and UI templating engine.",
        "problem": "Data scientists struggled to turn analytical scripts into interactive web applications, often requiring them to learn complex frontend frameworks or rely on engineering teams.",
        "solution": "StreamLit (Custom Integration) provides a seamless bridge between Python data scripts and interactive UI components, auto-generating reactive web interfaces directly from backend code.",
        "impact": "<li>Empowered data teams to deploy interactive tools independently.</li><li>Drastically reduced the time-to-market for internal data applications.</li><li>Eliminated the need for dedicated frontend resources for data dashboards.</li>"
    },
    "neonscope": {
        "short_desc": "Serverless database connection pooling and query observability.",
        "problem": "Serverless functions frequently exhausted database connections due to rapid scaling, leading to connection timeouts and erratic query performance.",
        "solution": "NeonScope introduces an intelligent, edge-aware connection pooling proxy with deep query observability, optimizing connection lifetimes and highlighting slow queries.",
        "impact": "<li>Prevented database connection exhaustion during traffic spikes.</li><li>Provided actionable insights into query performance and latency.</li><li>Stabilized serverless application performance under heavy load.</li>"
    },
    "latchlist": {
        "short_desc": "High-concurrency distributed locking and synchronization primitive.",
        "problem": "Coordinating critical sections across distributed microservices was prone to race conditions, deadlocks, and split-brain scenarios when relying on basic database locks.",
        "solution": "LatchList implements a robust, fault-tolerant distributed locking mechanism using consensus algorithms, ensuring safe, mutually exclusive access to shared resources.",
        "impact": "<li>Eliminated data corruption caused by concurrent race conditions.</li><li>Provided resilient synchronization even during network partitions.</li><li>Simplified complex coordination logic across distributed systems.</li>"
    }
}

out_dir = "/root/portfolio3/home/case-studies"
os.makedirs(out_dir, exist_ok=True)

for app in apps:
    slug = app["slug"]
    name = app["name"]
    app_data = data.get(slug)
    
    html_content = template.format(
        slug=slug,
        name=name,
        short_desc=app_data["short_desc"],
        problem_desc=app_data["problem"],
        solution_desc=app_data["solution"],
        impact_list=app_data["impact"]
    )
    
    out_path = os.path.join(out_dir, f"{slug}.html")
    with open(out_path, "w") as f:
        f.write(html_content)
        
    print(f"Created {out_path}")

print("All done.")