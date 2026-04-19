---
title: "Release Readiness"
severity: "medium"
systems: ["deploy", "frontend", "api"]
symptoms: ["unknown"]
fixes: ["preflight"]
last_verified: 2026-03-01
---

- Confirm rollback artifact is published and verified.
- Confirm migrations are backward compatible for one version.
- Confirm synthetic checks are green in staging and canary.
- Confirm on-call handoff includes blast radius notes.
