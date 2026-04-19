---
title: "API Rate Limit Breach"
severity: "high"
systems: ["api", "gateway"]
symptoms: ["429s", "throttling"]
fixes: ["quota-adjustment", "traffic-shaping"]
last_verified: 2026-03-01
---

## Signal
- Request rejection rate exceeds 12%
- High-priority client keys are throttled

## Immediate Actions
1. Confirm abusive clients versus normal traffic growth.
2. Apply temporary weighted limits by client tier.
3. Enable burst queue for write-heavy endpoints.

## Validation
- 429 rate under 2%
- No elevated p95 latency for premium routes
