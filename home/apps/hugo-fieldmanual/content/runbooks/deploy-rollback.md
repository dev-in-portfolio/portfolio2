---
title: "Deploy Rollback"
severity: "critical"
systems: ["deploy", "frontend"]
symptoms: ["errors", "regression"]
fixes: ["rollback", "cache-bust"]
last_verified: 2026-02-20
---

## Steps
1. Freeze deploy pipeline
2. Rollback to last known good release
3. Bust edge cache
4. Monitor error rate for 30 minutes
