---
title: "Postgres Failover"
severity: "critical"
systems: ["database", "replication"]
symptoms: ["write-failures", "connection-reset"]
fixes: ["promote-replica", "dns-flip"]
last_verified: 2026-03-01
---

## Procedure
1. Confirm primary is unavailable for 60+ seconds.
2. Promote healthiest replica and freeze schema migrations.
3. Update connection routing and recycle API pools.

## Post-checks
- Write throughput restored
- Replica lag below 3 seconds
