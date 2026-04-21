# PORTFOLIO2 REPO OPERATING MEMORY

This file adds repo-specific execution rules for `portfolio2`. Use it alongside the global operating memory, not instead of it.

## REPO SHAPE
- This is a multi-site repo, not a single-site app.
- Treat `home/`, `about/`, `contact/`, and `apps/` as separate site roots unless the task clearly spans more than one site.
- Do not assume a change in one site should be mirrored into the others unless the shared structure or the user request makes that necessary.
- Before editing, identify which site root actually owns the behavior.
- Under no circumstances should broad repo-wide or "global cleanup" edits be made by default in this repo.
- This system has fragile areas and cross-site coupling that can break silently.
- Default to extreme surgical precision: smallest possible diff, narrowest possible file set, narrowest possible runtime surface.

## DEPLOYMENT TARGETING
- This repo uses multiple Netlify site IDs.
- Use the repo env file `~/.config/codex/repo-env/portfolio2.env`.
- Verify the exact target before any deploy or site-level config change.
- Expected site env vars:
  - `PORTFOLIO2_HOME_NETLIFY_SITE_ID`
  - `PORTFOLIO2_ABOUT_NETLIFY_SITE_ID`
  - `PORTFOLIO2_CONTACT_NETLIFY_SITE_ID`
  - `PORTFOLIO2_APPS_NETLIFY_SITE_ID`
- Do not collapse deployment logic into one `NETLIFY_SITE_ID` unless the user explicitly asks for that.

## CHANGE SCOPING
- Prefer the smallest site-scoped change that solves the request.
- Keep shared changes in shared locations when the same behavior is genuinely common across sites.
- Keep site-specific changes local when only one site is affected.
- If a requested change appears duplicated across multiple site roots, check whether that duplication is intentional before normalizing it.
- Do not perform repo-wide search-and-replace, cross-site cleanup, naming normalization, or shared refactors unless the user explicitly asks for that exact broader scope.
- If a fix appears to invite a "global" solution, pause and prefer the local fix unless the broader change is clearly required for correctness.
- Treat root-level edits, shared asset edits, shared config edits, and shared script edits as high-risk changes that need stronger justification and tighter validation than site-local edits.

## FILE OWNERSHIP DEFAULTS
- `home/`, `about/`, `contact/`, and `apps/` own their own `index.html`, static assets, Netlify config, and tests.
- `shared/` directories inside site roots are the first place to look for within-site shared code/assets.
- Root-level files should not be treated as global runtime for all sites unless the repo structure proves that.

## VALIDATION RULES
- Validate at the site root you changed.
- If a change touches shared behavior used by more than one site, test the affected sibling sites too.
- For deploy-related work, verify both local file changes and target-site mapping before concluding.
- Be explicit about which site(s) were checked and which site(s) remain unverified.
- When a change touches anything outside one site root, explicitly call out the blast radius before proceeding.

## REPO-SPECIFIC REPORTING
- In summaries, name the affected site root explicitly.
- If a finding applies only to one site, say so.
- If a finding may affect multiple site roots, call out the spread instead of presenting it as single-page behavior.

## DIRTY REPO / PUSH BEHAVIOR POLICY
- A dirty working tree is not, by itself, a blocker.
- Local-only files, old page versions, scratch files, sandbox artifacts, and unrelated untracked files may exist intentionally. Do not treat their presence alone as a reason to stop.

### Read-only tasks
- For inspect/search/read/compare/list/check tasks, do not repeatedly warn about dirty or untracked files.
- For inspect/search/read/compare/list/check tasks, do not treat dirty state as a blocker.
- Mention repo state once only if it is directly relevant.

### Write/history-changing tasks
- For commit/push/merge/rebase/branching tasks, dirty state matters only because history-writing actions must be scoped correctly.
- Do not default to asking broad workflow questions if the intended change set can be inferred.
- First isolate the likely intended files from the user request.
- Stage only the intended files.
- Do not include unrelated modified or untracked files unless the user explicitly asks for the whole local state.
- Prefer creating a new branch for scoped pushes when `main` is dirty or diverged.
- Do not reset, clean, stash, or discard anything unless explicitly instructed.

### Default push behavior
- If the user says things like "push portfolio2 to git", "commit this", "push the app sync", or "push the changes", default to the smallest safe interpretation.
- Identify the intended change set from prior context.
- Create a scoped branch.
- Commit only the intended files.
- Push that branch.
- Report exactly what was included and what was intentionally excluded.

### When to ask a question
- Only ask a follow-up if there is genuine ambiguity that cannot be resolved from context.
- Examples: two equally plausible intended change sets, overlapping changes where file ownership is unclear, or an ambiguous push target or repo.

### Important
- Do not use the existence of unrelated dirty or untracked files as an excuse to stall.
- Do not make the user re-decide obvious scoping that can be inferred from the active task.
