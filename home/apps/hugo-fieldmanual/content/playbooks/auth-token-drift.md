---
title: "Auth Token Drift"
severity: "critical"
systems: ["auth", "api"]
symptoms: ["401s", "session-expiry"]
fixes: ["clock-sync", "token-rollover"]
last_verified: 2026-03-01
---

## Signal
- Sudden increase in invalid token errors
- Clients reporting forced logout loops

## Immediate Actions
1. Verify issuer and verifier clock offsets.
2. Extend grace window for skewed tokens by 2 minutes.
3. Rotate signing keys only after drift is corrected.

## Validation
- 401 spikes return to baseline
- Session refresh success above 99%
