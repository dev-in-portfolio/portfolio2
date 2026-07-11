# Solo repository swap plan

The standalone repositories `dev-in-portfolio/Alibi` and `dev-in-portfolio/Coverage-Compass` are the current source versions. Their corresponding copies inside `portfolio2` must be replaced, not preserved as the source of truth.

Targets:
- `dev-in-portfolio/Alibi` -> `apps/apps/alibi/`
- `dev-in-portfolio/Coverage-Compass` -> `apps/apps/coverage-compass/`

The swap must preserve the outer portfolio routing/build contract while replacing each app's internal source with the standalone repository version.
