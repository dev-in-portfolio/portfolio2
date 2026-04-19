---
title: "Cache Degraded"
severity: "high"
systems: ["cache", "api"]
symptoms: ["latency", "timeouts"]
fixes: ["scale", "eviction"]
last_verified: 2026-02-28
---

## Signal
- P95 latency spikes above 2s
- Cache hit rate below 70%

## Immediate Actions
1. Scale cache nodes by 1-2 units
2. Increase max memory and eviction threshold
3. Verify keyspace hot keys

## Validation
- Hit rate stabilizes > 90%
- P95 latency returns to baseline
