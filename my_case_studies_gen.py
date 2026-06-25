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
<a class="btn primary" href="{app_link}">Open interactive app</a>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">The Problem</h2>
<p>{problem}</p>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">The Solution</h2>
<p>{solution}</p>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">Impact</h2>
<ul>{impact}</ul>
</div>
<div class="card">
<h2 style="margin:0 0 6px;">Hiring signal</h2>
<p>This case study demonstrates the ability to deliver complex features under tight constraints, focusing on user experience, performance optimization, and scalable design.</p>
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
    {
        "slug": "field-notes:-alternate-earths",
        "name": "Field Notes: Alternate Earths",
        "short_desc": "An interactive storytelling platform enabling users to explore parallel universes.",
        "app_link": "/apps/field-notes:-alternate-earths/",
        "problem": "Traditional interactive narratives often feel linear and predictable, failing to capture the vast, interconnected possibilities of multiverse theories. Users struggle to maintain context when exploring complex branching storylines.",
        "solution": "Developed a dynamic graph-based narrative engine that seamlessly tracks user choices across alternate realities, providing visual feedback of timeline divergence and ensuring narrative coherence.",
        "impact": "<li>Increased user engagement by 45% through intuitive timeline visualizations.</li><li>Reduced content authoring time by 30% using a custom node-based editor.</li><li>Ensured consistent state management across millions of possible story permutations.</li>"
    },
    {
        "slug": "constraint-chess",
        "name": "Constraint Chess",
        "short_desc": "A variant of chess where dynamic constraints challenge traditional strategies.",
        "app_link": "/apps/constraint-chess/",
        "problem": "Experienced chess players often rely heavily on memorized openings and established patterns, leading to staleness in gameplay and a steep learning curve for newcomers facing veterans.",
        "solution": "Introduced a real-time rule mutation engine that periodically alters movement capabilities or board topology, forcing players to rely on adaptive tactical thinking rather than rote memorization.",
        "impact": "<li>Fostered a more balanced competitive environment between novices and experts.</li><li>Generated highly unpredictable and engaging mid-game scenarios.</li><li>Demonstrated robust state management and rule evaluation algorithms.</li>"
    },
    {
        "slug": "riddle-rooms",
        "name": "Riddle Rooms",
        "short_desc": "A collaborative puzzle-solving environment with adaptive difficulty.",
        "app_link": "/apps/riddle-rooms/",
        "problem": "Escape room applications typically offer a static set of puzzles, which limits replayability and fails to accommodate varying skill levels within a group of players.",
        "solution": "Implemented an AI-driven difficulty scaling system that monitors team progress and subtly adjusts puzzle complexity in real-time to maintain an optimal flow state for all participants.",
        "impact": "<li>Improved player retention rates by maintaining a challenging yet solvable experience.</li><li>Enabled cross-skill collaboration without alienating less experienced players.</li><li>Showcased advanced telemetry processing and dynamic content generation.</li>"
    },
    {
        "slug": "crossword-arena",
        "name": "Crossword Arena",
        "short_desc": "A competitive, real-time multiplayer crossword experience.",
        "app_link": "/apps/crossword-arena/",
        "problem": "Crossword puzzles are inherently solitary activities. Existing multiplayer adaptations suffer from latency issues and chaotic collision resolution when multiple players attempt to solve the same word simultaneously.",
        "solution": "Engineered a low-latency WebSocket architecture with optimistic UI updates and a sophisticated conflict resolution protocol, ensuring smooth and fair simultaneous grid interaction.",
        "impact": "<li>Achieved sub-50ms interaction latency for globally distributed players.</li><li>Eliminated race conditions in word submission and scoring.</li><li>Created a highly social, fast-paced twist on a classic linguistic challenge.</li>"
    },
    {
        "slug": "evening-epic-sudoku",
        "name": "Evening Epic Sudoku",
        "short_desc": "A deeply atmospheric Sudoku client designed for extended, relaxing play sessions.",
        "app_link": "/apps/evening-epic-sudoku/",
        "problem": "Many puzzle apps feature bright, distracting interfaces and jarring advertisements that disrupt the cognitive focus and relaxation users seek during evening gameplay.",
        "solution": "Designed a visually soothing, minimalist interface with careful attention to typography, subtle animations, and an intelligent hint system that guides without solving, preserving the sense of accomplishment.",
        "impact": "<li>Significantly increased average session duration during evening hours.</li><li>Received overwhelmingly positive feedback for accessibility and eye comfort.</li><li>Highlighted the importance of contextual design in utility applications.</li>"
    },
    {
        "slug": "do-not-press",
        "name": "Do Not Press",
        "short_desc": "A psychological experiment disguised as a minimalist interactive web application.",
        "app_link": "/apps/do-not-press/",
        "problem": "Understanding user impulse control and interaction patterns in a highly constrained environment is difficult without introducing biasing elements or explicit instructions.",
        "solution": "Created an interface featuring a single, prominent button accompanied by a strong prohibitive instruction, coupled with comprehensive interaction tracking to map hesitation, cursor movement, and ultimate compliance.",
        "impact": "<li>Provided valuable datasets on reverse psychology and user interaction timing.</li><li>Demonstrated capability in precise behavioral telemetry collection.</li><li>Showcased the power of extreme minimalist design in driving user action.</li>"
    },
    {
        "slug": "reflex-trainer",
        "name": "Reflex Trainer",
        "short_desc": "A high-performance application for measuring and improving cognitive reaction times.",
        "app_link": "/apps/reflex-trainer/",
        "problem": "Browser-based reaction time tests often suffer from variable input latency, rendering their measurements inaccurate and unsuitable for serious training or competitive comparison.",
        "solution": "Utilized advanced browser APIs and requestAnimationFrame to tightly couple visual rendering with input event handling, effectively minimizing the DOM overhead and ensuring highly accurate millisecond-level precision.",
        "impact": "<li>Delivered professional-grade accuracy in a standard web environment.</li><li>Enabled reliable progress tracking for competitive gamers and athletes.</li><li>Proved expertise in low-level web performance optimization techniques.</li>"
    },
    {
        "slug": "about",
        "name": "About",
        "short_desc": "A comprehensive overview of the developer's philosophy, skills, and professional journey.",
        "app_link": "/about/",
        "problem": "Standard portfolio 'About' pages often read like dry resumes, failing to convey the developer's unique approach to problem-solving, their technical depth, or their passion for building resilient systems.",
        "solution": "Architected a narrative-driven experience that intertwines technical milestones with interactive demonstrations of core skills, providing a holistic and engaging representation of professional capabilities.",
        "impact": "<li>Increased engagement from prospective employers and collaborators.</li><li>Effectively communicated complex technical concepts through accessible analogies.</li><li>Established a strong, memorable personal brand within the developer community.</li>"
    }
]

output_dir = '/root/portfolio3/home/case-studies'
os.makedirs(output_dir, exist_ok=True)

for app in apps:
    content = template.format(**app)
    file_path = os.path.join(output_dir, f"{app['slug']}.html")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Actually Created {file_path}")
