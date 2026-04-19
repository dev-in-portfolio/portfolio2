---
title: "Queue Backlog Burn"
severity: "high"
systems: ["queue", "workers"]
symptoms: ["message-delay", "retry-storm"]
fixes: ["worker-scale", "poison-isolation"]
last_verified: 2026-03-01
---

## Procedure
1. Measure backlog age and retry amplification.
2. Quarantine poison messages to dead-letter immediately.
3. Scale workers based on oldest message age target.

## Post-checks
- Oldest message age under 60 seconds
- Retry ratio under 1.2x
