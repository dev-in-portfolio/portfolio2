---
title: "Auth Expiry Incident 2026-02-03"
severity: "critical"
systems: ["auth", "gateway"]
symptoms: ["401s", "session-expiry"]
fixes: ["clock-sync", "token-refresh"]
last_verified: 2026-02-25
---

## Summary
Clock skew between token issuer and verifier caused cascading authentication failures.

## Corrective Actions
- Enforced NTP drift alarms at 250ms.
- Added canary token validation checks every minute.
