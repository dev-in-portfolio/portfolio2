---
title: "Queue Delay Incident 2026-01-12"
severity: "high"
systems: ["queue", "workers"]
symptoms: ["latency", "timeouts"]
fixes: ["backpressure", "worker-autoscale"]
last_verified: 2026-02-20
---

## Summary
A burst of retries saturated worker pools and delayed event processing by up to 24 minutes.

## Corrective Actions
- Added retry jitter and dead-letter guardrails.
- Added backlog-age autoscaling target.
